#!/bin/bash

# Fraud Detection API Deployment Script
# This script automates the deployment process for production environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="fraud-detection-api"
DOCKER_IMAGE="$APP_NAME:latest"
CONTAINER_NAME="$APP_NAME-container"
NETWORK_NAME="$APP_NAME-network"
SSL_DIR="./ssl"
LOGS_DIR="./logs"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking system requirements..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if required files exist
    required_files=("Dockerfile" "docker-compose.yml" "config.yaml" "app.py")
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file '$file' not found."
            exit 1
        fi
    done
    
    log_success "All requirements satisfied."
}

setup_directories() {
    log_info "Setting up directories..."
    
    # Create SSL directory if it doesn't exist
    if [[ ! -d "$SSL_DIR" ]]; then
        mkdir -p "$SSL_DIR"
        log_warning "SSL directory created. Please add your SSL certificates (cert.pem and key.pem) to $SSL_DIR"
    fi
    
    # Create logs directory
    if [[ ! -d "$LOGS_DIR" ]]; then
        mkdir -p "$LOGS_DIR"
        log_info "Logs directory created at $LOGS_DIR"
    fi
    
    # Set proper permissions
    chmod 755 "$LOGS_DIR"
    
    log_success "Directories setup completed."
}

generate_self_signed_cert() {
    if [[ ! -f "$SSL_DIR/cert.pem" ]] || [[ ! -f "$SSL_DIR/key.pem" ]]; then
        log_warning "SSL certificates not found. Generating self-signed certificate..."
        
        openssl req -x509 -newkey rsa:4096 -keyout "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" \
            -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        chmod 600 "$SSL_DIR/key.pem"
        chmod 644 "$SSL_DIR/cert.pem"
        
        log_warning "Self-signed certificate generated. Replace with proper certificates for production."
    fi
}

validate_config() {
    log_info "Validating configuration..."
    
    # Check if models directory exists
    if [[ ! -d "models" ]]; then
        log_error "Models directory not found. Please ensure all model files are present."
        exit 1
    fi
    
    # Validate config.yaml
    if ! python -c "import yaml; yaml.safe_load(open('config.yaml'))" 2>/dev/null; then
        log_error "Invalid YAML configuration in config.yaml"
        exit 1
    fi
    
    log_success "Configuration validation completed."
}

build_image() {
    log_info "Building Docker image..."
    
    docker build -t "$DOCKER_IMAGE" .
    
    log_success "Docker image built successfully."
}

deploy_with_compose() {
    log_info "Deploying with Docker Compose..."
    
    # Stop existing containers
    docker-compose down 2>/dev/null || true
    
    # Start services
    docker-compose up -d
    
    log_success "Services deployed successfully."
}

wait_for_health() {
    log_info "Waiting for service to become healthy..."
    
    max_attempts=30
    attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:5002/health &>/dev/null; then
            log_success "Service is healthy and ready!"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts: Service not ready yet, waiting..."
        sleep 10
        ((attempt++))
    done
    
    log_error "Service failed to become healthy within the timeout period."
    return 1
}

show_status() {
    log_info "Deployment Status:"
    echo
    
    # Show running containers
    echo "Running containers:"
    docker-compose ps
    echo
    
    # Show service endpoints
    echo "Service endpoints:"
    echo "  - Health Check: http://localhost:5002/health"
    echo "  - API Status: http://localhost:5002/status"
    echo "  - Motion Encoder: http://localhost:5002/encode/motion"
    echo "  - Gesture Encoder: http://localhost:5002/encode/gesture"
    echo "  - Typing Encoder: http://localhost:5002/encode/typing"
    echo
    
    # Show logs command
    echo "To view logs:"
    echo "  docker-compose logs -f fraud-detection-api"
    echo
    
    # Show monitoring (if enabled)
    if docker-compose ps | grep -q prometheus; then
        echo "Monitoring:"
        echo "  - Prometheus: http://localhost:9090"
        echo "  - Grafana: http://localhost:3000 (admin/admin)"
        echo
    fi
}

cleanup() {
    log_info "Cleaning up..."
    
    docker-compose down
    docker system prune -f
    
    log_success "Cleanup completed."
}

show_help() {
    echo "Fraud Detection API Deployment Script"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  deploy     Deploy the application (default)"
    echo "  build      Build Docker image only"
    echo "  start      Start existing deployment"
    echo "  stop       Stop running deployment"
    echo "  restart    Restart deployment"
    echo "  status     Show deployment status"
    echo "  logs       Show application logs"
    echo "  cleanup    Stop and remove all containers"
    echo "  monitor    Deploy with monitoring stack"
    echo "  help       Show this help message"
    echo
}

# Main execution
case "${1:-deploy}" in
    "deploy")
        log_info "Starting deployment process..."
        check_requirements
        setup_directories
        generate_self_signed_cert
        validate_config
        build_image
        deploy_with_compose
        wait_for_health
        show_status
        log_success "Deployment completed successfully!"
        ;;
    
    "build")
        check_requirements
        build_image
        ;;
    
    "start")
        log_info "Starting services..."
        docker-compose up -d
        wait_for_health
        show_status
        ;;
    
    "stop")
        log_info "Stopping services..."
        docker-compose down
        log_success "Services stopped."
        ;;
    
    "restart")
        log_info "Restarting services..."
        docker-compose restart
        wait_for_health
        show_status
        ;;
    
    "status")
        show_status
        ;;
    
    "logs")
        docker-compose logs -f fraud-detection-api
        ;;
    
    "cleanup")
        cleanup
        ;;
    
    "monitor")
        log_info "Deploying with monitoring stack..."
        check_requirements
        setup_directories
        generate_self_signed_cert
        validate_config
        build_image
        docker-compose --profile monitoring up -d
        wait_for_health
        show_status
        log_success "Deployment with monitoring completed!"
        ;;
    
    "help")
        show_help
        ;;
    
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac