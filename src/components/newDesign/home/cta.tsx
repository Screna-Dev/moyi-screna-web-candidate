import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { ArrowRight, Mail } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function CTA() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/auth?email=${encodeURIComponent(email)}`);
  };

  return (
    <section className="py-32 bg-[hsl(220,20%,98%)] relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[hsl(221,91%,60%)]/5 blur-[120px] rounded-full -z-10" />

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-semibold text-[hsl(222,22%,15%)] mb-6 tracking-tight leading-tight">
            Ready to land your next{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(221,91%,60%)] to-[hsl(221,80%,45%)]">
              offer
            </span>?
          </h2>
          <p className="text-xl text-[hsl(222,12%,45%)] mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of job seekers practicing with AI today. No credit card required.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto w-full">
            <div className="relative w-full">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(222,12%,45%)]" />
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 rounded-full border border-[hsl(220,16%,90%)] bg-white text-[hsl(222,22%,15%)] focus:border-[hsl(221,91%,60%)] focus:ring-2 focus:ring-[hsl(221,91%,60%)]/20 outline-none transition-all shadow-sm text-base"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-[hsl(222,22%,15%)] hover:bg-[hsl(222,22%,10%)] text-white font-medium text-base shadow-lg hover:shadow-xl transition-all h-[58px]"
            >
              Get Started
            </Button>
          </form>

          <p className="text-sm text-[hsl(222,12%,45%)] mt-6">
            Free forever for individual use. <span className="underline decoration-dotted cursor-pointer hover:text-[hsl(221,91%,60%)]">See pricing</span> for teams.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
