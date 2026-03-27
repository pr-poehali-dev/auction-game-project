import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				playfair: ['"Playfair Display"', 'serif'],
				oswald: ['Oswald', 'sans-serif'],
				cormorant: ['"Cormorant Garamond"', 'serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				gold: {
					DEFAULT: '#daa520',
					light: '#ffd700',
					dark: '#b8860b',
					pale: '#ffed8a',
				},
				crimson: {
					DEFAULT: '#c0392b',
					dark: '#8b0000',
					light: '#e74c3c',
				},
				velvet: {
					DEFAULT: '#0d0d0d',
					card: '#111111',
					light: '#1a1a1a',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'gold-shimmer': {
					'0%': { backgroundPosition: '-200% center' },
					'100%': { backgroundPosition: '200% center' },
				},
				'glow-pulse': {
					'0%, 100%': { boxShadow: '0 0 10px rgba(184,134,11,0.3)' },
					'50%': { boxShadow: '0 0 30px rgba(255,215,0,0.5)' },
				},
				'slot-spin': {
					'0%': { transform: 'translateY(0)' },
					'100%': { transform: 'translateY(-300%)' },
				},
				'fade-in-up': {
					from: { opacity: '0', transform: 'translateY(20px)' },
					to: { opacity: '1', transform: 'translateY(0)' },
				},
				'scale-in': {
					from: { opacity: '0', transform: 'scale(0.9)' },
					to: { opacity: '1', transform: 'scale(1)' },
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-6px)' },
				},
				'win-flash': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.3' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'gold-shimmer': 'gold-shimmer 3s linear infinite',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
				'scale-in': 'scale-in 0.3s ease-out forwards',
				'float': 'float 3s ease-in-out infinite',
				'win-flash': 'win-flash 0.3s ease-in-out 6',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
