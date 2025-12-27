from app import app, initialize_encoders
import logging

# Set up debug logging
logging.basicConfig(level=logging.DEBUG)

if __name__ == '__main__':
    if initialize_encoders():
        print("Starting Flask application in debug mode...")
        print("Available routes:")
        for rule in app.url_map.iter_rules():
            print(f"  {rule.rule} -> {rule.endpoint} [{', '.join(rule.methods)}]")
        
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        print("Failed to initialize encoders. Exiting.")
        exit(1)