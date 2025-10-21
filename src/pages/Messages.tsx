import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Send, Eye, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Messages() {
  const messages = [
    { id: 1, type: 'pushed', jobTitle: 'Senior Backend Engineer', company: 'Acme', timestamp: '2h ago', pushMode: 'auto' },
    { id: 2, type: 'viewed', jobTitle: 'Data Analyst', company: 'Contoso', timestamp: '1 day ago', viewed: { profile: true, metrics: true } }
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-5xl space-y-6">
        <h1 className="text-4xl font-bold">Messages</h1>
        <p className="text-muted-foreground">System pushes and recruiter engagement</p>
        
        <div className="space-y-4">
          {messages.map(msg => (
            <Card key={msg.id} className="p-6">
              <div className="flex items-start gap-4">
                {msg.type === 'pushed' ? <Send className="w-6 h-6 text-primary" /> : <Eye className="w-6 h-6 text-secondary" />}
                <div className="flex-1">
                  <p className="font-bold mb-1">
                    {msg.type === 'pushed' ? `Profile pushed to ${msg.jobTitle} @ ${msg.company}` : `Recruiter viewed your Profile & Metrics for ${msg.jobTitle}`}
                  </p>
                  <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{msg.timestamp}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" asChild><Link to="/jobs">Open Job</Link></Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
