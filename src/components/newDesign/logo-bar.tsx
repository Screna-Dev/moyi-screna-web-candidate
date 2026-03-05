import { motion } from 'motion/react';

const companies = [
  'Google',
  'Meta',
  'Amazon',
  'Microsoft',
  'Apple',
  'Netflix',
  'Tesla',
  'Uber',
  'Airbnb',
  'Spotify',
  'LinkedIn',
  'Stripe',
];

export function LogoBar() {
  // Duplicate the array for seamless loop
  const duplicatedCompanies = [...companies, ...companies];

  return (
    <section className="py-16 bg-gradient-to-b from-[#F9FAFB] to-[hsl(220,20%,98%)] border-b border-gray-200/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
            Trusted by job seekers at
          </p>
          <h3 className="text-2xl font-semibold text-gray-700">
            Our users landed interviews at top companies
          </h3>
        </div>

        {/* Logo scrolling container */}
        <div className="relative overflow-hidden">
          {/* Gradient overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[hsl(220,20%,98%)] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[hsl(220,20%,98%)] to-transparent z-10" />

          <motion.div
            className="flex gap-16"
            animate={{
              x: [0, -50 + '%'],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: 'loop',
                duration: 30,
                ease: 'linear',
              },
            }}
          >
            {duplicatedCompanies.map((company, index) => (
              <div
                key={`${company}-${index}`}
                className="flex-shrink-0 flex items-center justify-center px-8 py-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-300"
                style={{ minWidth: '180px' }}
              >
                <span className="text-xl font-semibold text-gray-600 whitespace-nowrap">
                  {company}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          Join thousands of successful candidates who prepared with{' '}
          <span className="font-semibold text-[hsl(221,91%,60%)]">
            Screna AI
          </span>
        </p>
      </div>
    </section>
  );
}
