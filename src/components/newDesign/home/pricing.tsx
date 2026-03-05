import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Check, Zap, Crown, Sparkles } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    tagline: 'Perfect for getting started',
    icon: Sparkles,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
    badge: null,
    cta: 'Get Started Free',
    ctaStyle: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
    cardStyle: 'bg-white border border-slate-200/80',
    features: [
      '30 initial Credits',
      '1 Interview Training Plan',
      '$0.15 per extra credit',
      '7 days data retention',
    ],
  },
  {
    name: 'Pro Plan',
    price: '$19.9',
    period: '/month',
    tagline: 'For serious candidates',
    icon: Zap,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    badge: 'Most Popular',
    cta: 'Get Pro',
    ctaStyle: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20',
    cardStyle: 'bg-white border-2 border-blue-500 shadow-xl shadow-blue-500/10',
    features: [
      '200 Credits (≈200 mins) monthly',
      '3 Interview Training Plans',
      '$0.12 per extra credit',
      'Full report with feedback',
      'Smart job matching',
      '90 days data retention',
    ],
  },
  {
    name: 'Elite Plan',
    price: '$39.9',
    period: '/month',
    tagline: 'Maximum preparation power',
    icon: Crown,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    badge: null,
    cta: 'Get Elite',
    ctaStyle: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
    cardStyle: 'bg-white border border-slate-200/80',
    features: [
      '500 Credits (≈500 mins) monthly',
      'Unlimited Interview Training Plans',
      '$0.10 per extra credit',
      'Video replay with timestamps',
      'Smart job matching',
      'Unlimited data retention',
    ],
  },
];

export function Pricing() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-100/40 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: 'easeOut' }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-6">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Pricing</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            Choose your plan
          </h2>
          <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            Select the plan that best fits your interview preparation needs.
            No hidden fees, cancel anytime.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 28 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.1 + i * 0.1, ease: 'easeOut' }}
                className={`relative rounded-3xl p-8 ${plan.cardStyle} transition-shadow duration-300 ${i === 1 ? 'md:-mt-4 md:mb-4' : ''}`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-4 py-1.5 rounded-full font-semibold shadow-md shadow-blue-600/20 whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                {/* Icon + Name */}
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-10 h-10 rounded-xl ${plan.iconBg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-[15px]">{plan.name}</p>
                    <p className="text-xs text-slate-400">{plan.tagline}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-7">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-slate-900 tracking-tight">{plan.price}</span>
                    <span className="text-slate-400 text-sm mb-1.5">{plan.period}</span>
                  </div>
                </div>

                {/* CTA */}
                <Link to="/auth">
                  <button className={`w-full h-11 rounded-full text-[14px] font-semibold transition-all duration-200 active:scale-[0.97] mb-8 ${plan.ctaStyle}`}>
                    {plan.cta}
                  </button>
                </Link>

                {/* Divider */}
                <div className="border-t border-slate-100 mb-6" />

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="text-sm text-slate-600 leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-sm text-slate-400 mt-10"
        >
          All plans include a free trial. No credit card required to start.
        </motion.p>
      </div>
    </section>
  );
}
