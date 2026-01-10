import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-6">
            Fraud Detection
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Advanced behavioral analysis and real-time monitoring to protect your platform from fraudulent activities.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:bg-card/80 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mr-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">User Registration</h3>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Register new users and collect behavioral data for comprehensive fraud analysis
              </p>
              <Link href="/register">
                <Button className="w-full group/btn" size="lg">
                  Start Registration
                  <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-primary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:bg-card/80 transition-all duration-300">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mr-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold">Behavioral Monitoring</h3>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Monitor user behavior patterns and detect anomalies in real-time
              </p>
              <Link href="/monitoring">
                <Button className="w-full group/btn" size="lg">
                  Start Monitoring
                  <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Admin Access */}
        <div className="text-center mt-16">
          <p className="text-sm text-muted-foreground mb-4">Administrative Access</p>
          <Link href="/admin">
            <Button variant="outline" className="group">
              Admin Dashboard
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
