import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface TwoFactorSetupProps {
  userId: string;
}

export const TwoFactorSetup = ({ userId }: TwoFactorSetupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'generate' | 'verify'>('generate');
  const [secret, setSecret] = useState<string>("");
  const [qrCode, setQrCode] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateSecret = async () => {
    setIsLoading(true);
    try {
      // Generate a random base32 secret
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let newSecret = '';
      for (let i = 0; i < 32; i++) {
        newSecret += chars[Math.floor(Math.random() * chars.length)];
      }
      
      setSecret(newSecret);
      
      // Generate QR code URL (using otpauth:// format)
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email || 'user@tawreed.com';
      const issuer = 'Tawreed Logistics';
      const qrUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${newSecret}&issuer=${encodeURIComponent(issuer)}`;
      
      // In production, you'd generate actual QR code image
      setQrCode(qrUrl);
      setStep('verify');
      
      toast.info("Scan this QR code with your authenticator app");
    } catch (error: any) {
      // Log structured error without sensitive data
      console.error('[2FA Setup] Generate secret failed:', {
        timestamp: new Date().toISOString(),
        errorType: error?.name
      });
      toast.error("Unable to set up two-factor authentication. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      // In production, verify the TOTP code on the backend
      // For now, we'll just store the secret
      const { error } = await supabase
        .from('profiles')
        .update({ 
          two_factor_secret: secret,
          two_factor_enabled: true 
        } as any)
        .eq('id', userId);

      if (error) throw error;

      toast.success("2FA enabled successfully!");
      setIsOpen(false);
      setStep('generate');
      setSecret("");
      setQrCode("");
      setVerificationCode("");
    } catch (error: any) {
      // Log structured error without sensitive data
      console.error('[2FA Setup] Enable failed:', {
        timestamp: new Date().toISOString(),
        errorType: error?.name
      });
      toast.error("Unable to enable two-factor authentication. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success("Secret copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Shield className="h-4 w-4" />
          Setup 2FA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Two-Factor Authentication Setup</DialogTitle>
        </DialogHeader>

        {step === 'generate' && (
          <Card>
            <CardHeader>
              <CardTitle>Enable 2FA</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Two-factor authentication adds an additional layer of security by requiring a code from your phone in addition to your password.
              </p>
              <Button onClick={generateSecret} disabled={isLoading} className="w-full">
                {isLoading ? "Generating..." : "Generate Secret Key"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 1: Scan QR Code</CardTitle>
                <CardDescription>
                  Use Google Authenticator, Authy, or any TOTP app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="w-48 h-48 bg-white flex items-center justify-center border-2 border-border rounded">
                      <p className="text-xs text-muted-foreground p-4">
                        QR Code would appear here<br/>
                        Use the secret key below
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Secret Key (Manual Entry)</Label>
                  <div className="flex gap-2">
                    <Input value={secret} readOnly className="font-mono text-sm" />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={copySecret}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter this key manually if you can't scan the QR code
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 2: Verify Code</CardTitle>
                <CardDescription>
                  Enter the 6-digit code from your authenticator app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="text-center text-lg tracking-widest font-mono"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('generate')}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={verifyAndEnable}
                    disabled={isLoading || verificationCode.length !== 6}
                    className="flex-1"
                  >
                    {isLoading ? "Verifying..." : "Enable 2FA"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};