import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import API from '@/services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Step state
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Request Reset', 'Reset Password'];
  
  // Form state
  const [email, setEmail] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Frontend validation helpers
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    const errors: string[] = [];
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
      errors.push("Password must contain at least one special character");
    }
    return errors;
  };

  // Validate email step
  const validateEmailStep = () => {
    const errors: Record<string, string[]> = {};
    
    if (!email.trim()) {
      errors.email = ["Email is required"];
    } else if (!validateEmail(email)) {
      errors.email = ["Please enter a valid email address"];
    }
    
    return errors;
  };

  // Validate reset password step
  const validateResetStep = () => {
    const errors: Record<string, string[]> = {};
    
    if (!confirmationCode.trim()) {
      errors.confirmationCode = ["Confirmation code is required"];
    }
    
    if (!newPassword) {
      errors.newPassword = ["New password is required"];
    } else {
      const passwordErrors = validatePassword(newPassword);
      if (passwordErrors.length > 0) {
        errors.newPassword = passwordErrors;
      }
    }
    
    if (!confirmPassword) {
      errors.confirmPassword = ["Please confirm your password"];
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = ["Passwords do not match"];
    }
    
    return errors;
  };

  // Handle input changes with error clearing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (fieldErrors.email) {
      setFieldErrors({ ...fieldErrors, email: [] });
    }
  };

  const handleConfirmationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmationCode(e.target.value);
    if (fieldErrors.confirmationCode) {
      setFieldErrors({ ...fieldErrors, confirmationCode: [] });
    }
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
    if (fieldErrors.newPassword) {
      setFieldErrors({ ...fieldErrors, newPassword: [] });
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (fieldErrors.confirmPassword) {
      setFieldErrors({ ...fieldErrors, confirmPassword: [] });
    }
  };

  // Handle forgot password submission (Step 1)
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setFieldErrors({});
    setError('');
    
    // Client-side validation
    const clientErrors = validateEmailStep();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setError('Please fix the validation errors below');
      return;
    }

    setIsLoading(true);
    
    try {
      // Call forgot password API
      const response = await API.post('/auth/forgot-password', {
        email: email
      });
      
      console.log('Forgot password response:', response.data);
      
      setSuccess('Reset code sent successfully! Please check your email for the confirmation code.');
      toast({
        title: 'Code sent!',
        description: 'Check your email for the confirmation code.'
      });
      
      // Move to reset password step
      setActiveStep(1);
      
    } catch (error: any) {
      console.error('Forgot password error:', error);
      
      if (error.response) {
        // Check if it's a validation error from backend
        if (error.response.status === 400 && 
            error.response.data?.errorCode === 'VALIDATION_ERROR' && 
            error.response.data?.data) {
          
          // Parse validation errors and group by field
          const validationErrors: Record<string, string[]> = {};
          error.response.data.data.forEach((validationError: any) => {
            const field = validationError.property;
            if (!validationErrors[field]) {
              validationErrors[field] = [];
            }
            validationErrors[field].push(validationError.message);
          });
          
          setFieldErrors(validationErrors);
          setError('Please fix the validation errors below');
        } else {
          // Handle other types of errors
          setError(error.response.data?.message || error.response.data || 'Failed to send reset code. Please try again.');
        }
      } else if (error.request) {
        setError('No response from server. Please try again later.');
      } else {
        setError('An error occurred. Please try again.');
      }
      
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send reset code',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle reset password submission (Step 2)
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setFieldErrors({});
    setError('');
    
    // Client-side validation
    const clientErrors = validateResetStep();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setError('Please fix the validation errors below');
      return;
    }

    setIsLoading(true);
    
    try {
      // Call confirm reset password API
      const response = await API.post('/auth/confirm-reset-password', {
        email: email,
        confirmationCode: confirmationCode,
        password: newPassword
      });
      
      console.log('Reset password response:', response.data);
      
      setSuccess('Password reset successfully! Redirecting to login...');
      toast({
        title: 'Success!',
        description: 'Password reset successfully. Redirecting to login...'
      });
      
      // Redirect to sign-in page after successful reset
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
      
    } catch (error: any) {
      console.error('Reset password error:', error);
      
      if (error.response) {
        // Check if it's a validation error from backend
        if (error.response.status === 400 && 
            error.response.data?.errorCode === 'VALIDATION_ERROR' && 
            error.response.data?.data) {
          
          // Parse validation errors and group by field
          const validationErrors: Record<string, string[]> = {};
          error.response.data.data.forEach((validationError: any) => {
            const field = validationError.property;
            if (!validationErrors[field]) {
              validationErrors[field] = [];
            }
            validationErrors[field].push(validationError.message);
          });
          
          setFieldErrors(validationErrors);
          setError('Please fix the validation errors below');
        } else {
          // Handle other types of errors
          setError(error.response.data?.message || error.response.data || 'Failed to reset password. Please check your confirmation code and try again.');
        }
      } else if (error.request) {
        setError('No response from server. Please try again later.');
      } else {
        setError('An error occurred. Please try again.');
      }
      
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reset password',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend confirmation code
  const handleResendCode = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Call forgot password API again to resend code
      const response = await API.post('/auth/forgot-password', {
        email: email
      });
      
      setSuccess('Confirmation code resent successfully!');
      toast({
        title: 'Code resent!',
        description: 'Check your email for the new confirmation code.'
      });
      
    } catch (error: any) {
      console.error('Resend code error:', error);
      
      if (error.response) {
        setError(error.response.data?.message || error.response.data || 'Failed to resend code');
      } else if (error.request) {
        setError('No response from server. Please try again later.');
      } else {
        setError('An error occurred. Please try again.');
      }
      
      toast({
        title: 'Error',
        description: 'Failed to resend code',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to render field errors
  const renderFieldErrors = (fieldName: string) => {
    if (fieldErrors[fieldName] && fieldErrors[fieldName].length > 0) {
      return (
        <div className="mt-1 space-y-1">
          {fieldErrors[fieldName].map((errorMessage, index) => (
            <p key={index} className="text-xs text-destructive">
              {errorMessage}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            {activeStep === 0 
              ? 'Enter your email to receive a reset code'
              : 'Enter the confirmation code and your new password'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stepper */}
          <div className="mb-6">
            <div className="flex items-center justify-center">
              {steps.map((label, index) => (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-medium transition-colors ${
                        index <= activeStep
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-muted'
                      }`}
                    >
                      {index < activeStep ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <p className={`text-xs mt-2 ${index <= activeStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {label}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 h-0.5 mx-2 mb-6 ${
                        index < activeStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="mb-4 border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">{success}</AlertDescription>
            </Alert>
          )}

          {activeStep === 0 ? (
            // Step 1: Email Input
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="john@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  disabled={isLoading}
                  className={fieldErrors.email && fieldErrors.email.length > 0 ? 'border-destructive' : ''}
                />
                {renderFieldErrors('email')}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Code'
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Remember your password?{' '}
                  <Link to="/auth" className="text-primary hover:underline font-medium">
                    Sign In
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            // Step 2: Reset Password Form
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="text-center mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  We've sent a confirmation code to <strong className="text-foreground">{email}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmationCode">Confirmation Code</Label>
                <Input
                  id="confirmationCode"
                  type="text"
                  value={confirmationCode}
                  onChange={handleConfirmationCodeChange}
                  placeholder="Enter code from email"
                  autoComplete="off"
                  required
                  disabled={isLoading}
                  className={fieldErrors.confirmationCode && fieldErrors.confirmationCode.length > 0 ? 'border-destructive' : ''}
                />
                {renderFieldErrors('confirmationCode')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                  className={fieldErrors.newPassword && fieldErrors.newPassword.length > 0 ? 'border-destructive' : ''}
                />
                {renderFieldErrors('newPassword')}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                  className={fieldErrors.confirmPassword && fieldErrors.confirmPassword.length > 0 ? 'border-destructive' : ''}
                />
                {renderFieldErrors('confirmPassword')}
              </div>

              <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                <p className="font-medium mb-1">Password requirements:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>At least 8 characters long</li>
                  <li>One uppercase letter</li>
                  <li>One lowercase letter</li>
                  <li>One number</li>
                  <li>One special character</li>
                </ul>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
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
                  onClick={() => setActiveStep(0)}
                  disabled={isLoading}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="inline-block w-4 h-4 mr-1" />
                  Back to Email
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}