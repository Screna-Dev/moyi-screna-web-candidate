import { useState } from 'react';
import { Mail, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import { Navbar } from '../../components/newDesign/home/navbar';
import { Footer } from '../../components/newDesign/home/footer';
import { SupportCTA } from '../../components/newDesign/home/support-cta';

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-[hsl(220,16%,90%)] bg-white text-[hsl(222,22%,15%)] placeholder:text-[hsl(222,12%,65%)] focus:outline-none focus:ring-2 focus:ring-[hsl(221,91%,60%)]/40 focus:border-[hsl(221,91%,60%)] transition-all';

  const labelClass = 'block text-sm text-[hsl(222,22%,15%)] mb-1.5';

  return (
    <div className="min-h-screen bg-[hsl(220,20%,98%)] flex flex-col">
      <Navbar />

      <main className="flex-1 px-[0px] pt-[107px] pb-[8px]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-start px-[0px] py-[103px]">
            {/* Left column */}
            <div className="pt-4">
              <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs bg-[hsl(221,91%,60%)]/10 text-[hsl(221,91%,60%)] mb-6">
                Contact
              </span>

              <h1 className="text-4xl lg:text-5xl text-[hsl(222,22%,15%)] mb-4 tracking-tight">
                Let's talk.
              </h1>

              <p className="text-lg text-[hsl(222,12%,45%)] mb-12 max-w-md leading-relaxed">
                Tell us what you're building, what you're stuck on, or what you want next.
              </p>

              {/* Info blocks */}
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[hsl(221,91%,60%)]/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-[hsl(221,91%,60%)]" />
                  </div>
                  <div>
                    <h3 className="text-sm text-[hsl(222,22%,15%)] mb-1">Email us</h3>
                    <a
                      href="mailto:operations@screna.ai"
                      className="text-[hsl(221,91%,60%)] text-sm hover:underline"
                    >
                      support@screna.ai
                    </a>
                    <p className="text-xs text-[hsl(222,12%,55%)] mt-1">We reply within 24 hours.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[hsl(221,91%,60%)]/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[hsl(221,91%,60%)]" />
                  </div>
                  <div>
                    <h3 className="text-sm text-[hsl(222,22%,15%)] mb-1">Working hours</h3>
                    <p className="text-sm text-[hsl(222,12%,45%)]">
                      Mon-Fri, 9:00 AM - 5:00 PM (EST)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column — Form card */}
            <div>
              <div className="bg-white rounded-2xl border border-[hsl(220,16%,90%)] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] p-8 lg:p-10">
                {submitted ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-full bg-[hsl(150,60%,94%)] flex items-center justify-center mx-auto mb-5">
                      <CheckCircle className="w-7 h-7 text-[hsl(150,60%,40%)]" />
                    </div>
                    <h2 className="text-xl text-[hsl(222,22%,15%)] mb-2">Message sent!</h2>
                    <p className="text-sm text-[hsl(222,12%,45%)] max-w-xs mx-auto">
                      Thanks for reaching out. We'll get back to you within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="firstName" className={labelClass}>
                          First name
                        </label>
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          value={form.firstName}
                          onChange={handleChange}
                          placeholder="Jane"
                          required
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="lastName" className={labelClass}>
                          Last name
                        </label>
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          value={form.lastName}
                          onChange={handleChange}
                          placeholder="Doe"
                          required
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="email" className={labelClass}>
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="jane@example.com"
                        required
                        className={inputClass}
                      />
                      <p className="text-xs text-[hsl(222,12%,65%)] mt-1.5 ml-1">
                        We'll only use this to reply.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="message" className={labelClass}>
                        Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Tell us how we can help..."
                        required
                        rows={5}
                        className={`${inputClass} resize-none`}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[hsl(221,91%,60%)] text-white text-sm hover:bg-[hsl(221,91%,55%)] active:bg-[hsl(221,91%,50%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(221,91%,60%)] transition-colors shadow-sm"
                    >
                      Submit
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <SupportCTA />

      <Footer />
    </div>
  );
}