import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, AlertCircle, CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Logo from "@/assets/logo.png"

// Google Icon SVG Component
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
  </svg>
);

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  
  // Verification step state
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  const { login, signup, loginWithGoogle, verifyEmail, resendVerificationCode } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const validatePassword = (password: string) => {
    const errors = [];
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (!/[^\w\s]/.test(password)) {
      errors.push("Password must contain at least one special character: ^ $ * . [ ] { } ( ) ? - \" ! @ # % & / \\ , > < ' : ; | ~ ` + =");
    }
    return errors;
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    // Only validate during signup
    if (!isLogin) {
      const errors = validatePassword(newPassword);
      setPasswordErrors(errors);
    }
  };

  const handleTabChange = (value: string) => {
    setIsLogin(value === 'login');
    // Clear all states when switching tabs
    setPasswordErrors([]);
    setPassword('');
    setError('');
    setShowVerification(false);
    setVerificationCode('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (!isLogin && !name) {
      setError('Please enter your name');
      return;
    }

    // Validate password on signup
    if (!isLogin) {
      const errors = validatePassword(password);
      if (errors.length > 0) {
        setPasswordErrors(errors);
        toast({ 
          title: 'Invalid Password', 
          description: 'Please meet all password requirements', 
          variant: 'destructive' 
        });
        return;
      }
    }

    setIsLoading(true);
    
    try {
      if (isLogin) {
        await login(email, password, rememberMe);
        toast({ 
          title: 'Welcome back!',
          description: 'You have successfully signed in.'
        });
        // Navigate after login succeeds
        navigate('/profile');
      } else {
        // Signup process
        await signup(email, password, name);
        
        // Store email for verification step
        setRegisteredEmail(email);
        
        // Show verification step instead of navigating
        setShowVerification(true);
        
        toast({ 
          title: 'Account created!',
          description: 'Please check your email for the verification code.'
        });
      }
    } catch (error: any) {
    console.error('Auth error:', error);
    
    // Check if this is an "email exists but not verified" error
    // Check both errorCode and message to handle different API responses
    const isEmailNotVerified = 
      error.response?.data?.errorCode === 'AUTH_EMAIL_NOT_VERIFIED' || 
      error.response?.data?.errorCode === 'USER_EXISTS_UNVERIFIED' ||
      error.response?.data?.errorCode === 'BAD_REQUEST' && 
      error.response?.data?.message?.toLowerCase().includes('email not verified');
    
    if (isEmailNotVerified) {
      // Store email for verification step
      setRegisteredEmail(email);
      
      // Show verification step
      setShowVerification(true);
      
      // Optionally trigger resend
      try {
        await resendVerificationCode(email);
      } catch (resendError) {
        console.error('Failed to resend code:', resendError);
      }
      
      toast({ 
        title: 'Email not verified',
        description: 'Please check your email for the verification code. We\'ve sent a new one.'
      });
      return;
    }
    
    let errorMessage = 'Something went wrong. Please try again.';
    
    if (error.response) {
      errorMessage = error.response.data?.message || 'Invalid email or password';
    } else if (error.request) {
      errorMessage = 'No response from server. Please check your connection.';
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    setError(errorMessage);
    toast({ 
      title: 'Error', 
      description: errorMessage, 
      variant: 'destructive' 
    });
  } finally {
    setIsLoading(false);
  }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode) {
      setError('Please enter the verification code');
      toast({
        title: 'Error',
        description: 'Please enter the verification code',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await verifyEmail(registeredEmail, verificationCode);
      
      toast({
        title: 'Email verified!',
        description: 'Your account has been verified successfully.'
      });
      
      // Reset form and switch to login
      setShowVerification(false);
      setIsLogin(true);
      setEmail('');
      setPassword('');
      setName('');
      setVerificationCode('');
      
    } catch (error: any) {
      console.error('Verification error:', error);
      
      let errorMessage = 'Invalid verification code. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'No response from server. Please try again later.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await resendVerificationCode(registeredEmail);
      
      toast({
        title: 'Code resent!',
        description: 'A new verification code has been sent to your email.'
      });
      
    } catch (error: any) {
      console.error('Resend error:', error);
      
      let errorMessage = 'Failed to resend code. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data?.message || errorMessage;
      }
      
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignup = () => {
    setShowVerification(false);
    setVerificationCode('');
    setError('');
  };

  const handleGoogleLogin = () => {  // Not async
    setError('');
    setIsGoogleLoading(true);

    try {
      loginWithGoogle();
    } catch (error: any) {
      console.error('Google auth error:', error);
      setError('Failed to initiate Google sign-in. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to initiate Google sign-in. Please try again.',
        variant: 'destructive'
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src = {Logo} alt = "Logo" className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Screna AI</CardTitle>
          <CardDescription>
            {showVerification 
              ? 'Verify your email address' 
              : 'Sign in to access your AI career assistant'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {showVerification ? (
            // Verification Form
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div className="text-center mb-6">
                <div className="flex justify-center mb-3">
                  <Mail className="w-16 h-16 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  We've sent a verification code to
                </p>
                <p className="text-sm font-semibold mt-1">{registeredEmail}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                  disabled={isLoading}
                  className="text-center text-lg tracking-widest"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>

              <div className="text-center text-sm space-y-2">
                <p className="text-muted-foreground">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-primary hover:underline font-medium"
                  >
                    Resend
                  </button>
                </p>
                <button
                  type="button"
                  onClick={handleBackToSignup}
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign Up
                </button>
              </div>
            </form>
          ) : (
            <Tabs value={isLogin ? 'login' : 'signup'} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      autoComplete="email"
                      required
                      disabled={isLoading || isGoogleLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      disabled={isLoading || isGoogleLoading}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      disabled={isLoading || isGoogleLoading}
                    />
                    <Label 
                      htmlFor="remember" 
                      className="text-sm font-normal cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleLogin}
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting to Google...
                      </>
                    ) : (
                      <>
                        <GoogleIcon />
                        <span className="ml-2">Sign in with Google</span>
                      </>
                    )}
                  </Button>

                  <div className="text-center text-sm">
                    <Link 
                      to="/forgot-password" 
                      className="text-primary hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      autoComplete="name"
                      required
                      disabled={isLoading || isGoogleLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@example.com"
                      autoComplete="email"
                      required
                      disabled={isLoading || isGoogleLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={handlePasswordChange}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                      disabled={isLoading || isGoogleLoading}
                      className={passwordErrors.length > 0 && password.length > 0 ? 'border-destructive' : ''}
                    />
                    
                    {/* Password Requirements */}
                    {password.length > 0 && (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="font-medium text-muted-foreground">Password Requirements:</div>
                        <div className="space-y-1">
                          <PasswordRequirement 
                            met={password.length >= 8}
                            text="At least 8 characters long"
                          />
                          <PasswordRequirement 
                            met={/[A-Z]/.test(password)}
                            text="Contains uppercase letter"
                          />
                          <PasswordRequirement 
                            met={/[a-z]/.test(password)}
                            text="Contains lowercase letter"
                          />
                          <PasswordRequirement 
                            met={/\d/.test(password)}
                            text="Contains number"
                          />
                          <PasswordRequirement 
                            met={/[^\w\s]/.test(password)}
                            text="Contains special character"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || isGoogleLoading || (!isLogin && passwordErrors.length > 0)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleLogin}
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting to Google...
                      </>
                    ) : (
                      <>
                        <GoogleIcon />
                        <span className="ml-2">Sign up with Google</span>
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for password requirement indicators
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : (
        <AlertCircle className="w-4 h-4 text-muted-foreground" />
      )}
      <span className={met ? 'text-green-600' : 'text-muted-foreground'}>
        {text}
      </span>
    </div>
  );
}