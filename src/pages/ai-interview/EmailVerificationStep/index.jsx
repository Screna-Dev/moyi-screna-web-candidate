// EmailVerificationStep.js - Email verification component
import React, { useState } from 'react';
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, Card
} from '@mui/material';
import { MailOutline, ArrowForward } from '@mui/icons-material';

function EmailVerificationStep({ 
  onVerify, 
  isVerifying, 
  error,
  screeningId 
}) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    if (emailError && value) {
      setEmailError('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    onVerify(email);
  };

  return (
    <Box 
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3
      }}
    >
      <Card 
        sx={{ 
          maxWidth: 500, 
          width: '100%',
          p: 4,
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Header */}
        <Box display="flex" flexDirection="column" alignItems="center" mb={4}>
          <Box
            sx={{
              width: 64,
              height: 64,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2
            }}
          >
            <MailOutline sx={{ fontSize: 32, color: 'white' }} />
          </Box>
          
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 700, 
              color: '#1e293b',
              mb: 1,
              textAlign: 'center'
            }}
          >
            Verify Your Email
          </Typography>
          
          <Typography 
            variant="body1" 
            color="#64748b"
            textAlign="center"
          >
            Please enter your email address to access the interview
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={() => {}}
          >
            {error}
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={handleEmailChange}
            error={!!emailError}
            helperText={emailError}
            disabled={isVerifying}
            placeholder="your.email@example.com"
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: '#3b82f6',
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <MailOutline sx={{ color: '#94a3b8', mr: 1 }} />
              ),
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isVerifying || !email}
            endIcon={isVerifying ? <CircularProgress size={20} /> : <ArrowForward />}
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 600,
              bgcolor: '#5341f4',
              color: '#f0f0f0',
              '&:hover': {
                bgcolor: '#2563eb',
              },
              '&:disabled': {
                bgcolor: '#e2e8f0',
                color: '#9ca3af'
              },
            }}
          >
            {isVerifying ? 'Verifying...' : 'Continue to Interview'}
          </Button>
        </form>

        {/* Info */}
        <Box 
          sx={{ 
            mt: 3, 
            p: 2, 
            bgcolor: '#eff6ff',
            borderRadius: 2,
            border: '1px solid #bfdbfe'
          }}
        >
          <Typography variant="body2" color="#1e40af">
            <strong>Note:</strong> This email should match the one you received the interview invitation at.
          </Typography>
        </Box>

        {/* Session Info */}
        {screeningId && (
          <Typography 
            variant="caption" 
            color="#94a3b8" 
            textAlign="center" 
            display="block"
            mt={3}
          >
            Session ID: {screeningId.substring(0, 12)}...
          </Typography>
        )}
      </Card>
    </Box>
  );
}

export default EmailVerificationStep;