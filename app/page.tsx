import Link from "next/link";
import { ArrowRight, Bot, Cpu, Database, Layers, Shield } from "lucide-react";

import { Button } from "../components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="top-0 z-40 sticky bg-background border-b">
        <div className="mx-auto container">
          <div className="flex justify-between items-center py-4 h-16">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6" />
              <span className="font-bold text-xl">Claude Batch</span>
            </div>
            <nav className="flex items-center gap-4">
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/register">
                <Button>Get Started</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="space-y-6 lg:py-32 pt-6 md:pt-10 pb-8 md:pb-12">
          <div className="mx-auto container">
            <div className="flex flex-col items-center gap-4 mx-auto max-w-[64rem] text-center">
              <h1 className="font-bold text-3xl sm:text-5xl md:text-6xl tracking-tighter">
                Batch Processing with Claude AI
              </h1>
              <p className="max-w-[42rem] text-muted-foreground sm:text-xl leading-normal sm:leading-8">
                A production-ready interface for the Anthropic Batch API. Process thousands of prompts efficiently with real-time status tracking.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="gap-1">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    Login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6 py-8 md:py-12 lg:py-24">
          <div className="mx-auto container">
            <div className="flex flex-col items-center space-y-4 mx-auto max-w-[58rem] text-center">
              <h2 className="font-bold text-3xl sm:text-3xl md:text-5xl leading-[1.1]">
                Features
              </h2>
              <p className="max-w-[85%] text-muted-foreground sm:text-lg leading-normal sm:leading-7">
                Everything you need to manage and process large batches of AI completions
              </p>
            </div>
            <div className="justify-center gap-4 grid sm:grid-cols-2 md:grid-cols-3 mx-auto mt-12 md:max-w-[64rem]">
              <Card>
                <CardHeader>
                  <Layers className="w-5 h-5 text-primary" />
                  <CardTitle className="mt-2">Batch Creation</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Create batches with dynamic message inputs and customizable model parameters.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Cpu className="w-5 h-5 text-primary" />
                  <CardTitle className="mt-2">Real-time Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Monitor batch processing status in real-time with detailed progress information.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Database className="w-5 h-5 text-primary" />
                  <CardTitle className="mt-2">History & Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Browse your batch history with advanced filtering and export capabilities.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Shield className="w-5 h-5 text-primary" />
                  <CardTitle className="mt-2">Secure API Keys</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Manage your Anthropic API keys securely with role-based access control.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 md:py-0 border-t">
        <div className="mx-auto container">
          <div className="flex md:flex-row flex-col justify-between items-center gap-4 md:h-24">
            <p className="text-muted-foreground text-sm md:text-left text-center leading-loose">
              &copy; {new Date().getFullYear()} Claude Batch. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
