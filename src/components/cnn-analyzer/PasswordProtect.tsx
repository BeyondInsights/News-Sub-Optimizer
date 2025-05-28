"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

interface PasswordProtectProps {
  onAuthenticated: (email: string) => void;
}

export default function PasswordProtect({ onAuthenticated }: PasswordProtectProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');
    // Basic password check (replace with secure auth in a real app)
    const correctPassword = "BEYOND Insights Rules";

    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (password === correctPassword) {
      console.log('Access attempt by:', email); // Logging attempt
      onAuthenticated(email);
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-8 mb-6">
            <Image src="https://i.imgur.com/B4zCjNq.png" alt="BEYOND Insights" width={120} height={60} className="object-contain" data-ai-hint="company logo" />
          </div>
          <CardTitle className="text-2xl">CNN Subscription Simulator</CardTitle>
          <CardDescription>Please enter your credentials to access the simulator.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="userEmail">Email Address</Label>
            <Input
              id="userEmail"
              type="email"
              placeholder="your.email@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userPassword">Access Password</Label>
            <Input
              id="userPassword"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              className="text-base"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button onClick={handleSubmit} className="w-full text-lg py-6 bg-primary hover:bg-primary/90">
            Access Simulator
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Authorized users only. Access attempts are logged.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
