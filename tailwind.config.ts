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
			screens: {
				'xs': '480px',    // Very small phones and up
				'sm': '640px',    // Small phones and up
				'md': '768px',    // Tablets and up
				'lg': '1024px',   // Small desktops and up
				'xl': '1280px',   // Medium desktops and up
				'2xl': '1536px',  // Large desktops and up
				'3xl': '1600px',  // Very large desktops and up
				'4xl': '1920px',  // Ultra-wide displays and up
				
				// Custom breakpoints for specific use cases
				'mobile-s': '320px',
				'mobile-m': '375px',
				'mobile-l': '425px',
				'tablet': '768px',
				'laptop': '1024px',
				'laptop-l': '1440px',
				'desktop': '1920px',
				'desktop-l': '2560px',
				
				// Height-based breakpoints
				'h-sm': { 'raw': '(min-height: 640px)' },
				'h-md': { 'raw': '(min-height: 768px)' },
				'h-lg': { 'raw': '(min-height: 1024px)' },
				
				// Orientation breakpoints
				'portrait': { 'raw': '(orientation: portrait)' },
				'landscape': { 'raw': '(orientation: landscape)' },
				
				// High DPI breakpoints
				'retina': { 'raw': '(-webkit-min-device-pixel-ratio: 2)' },
				'high-dpi': { 'raw': '(min-resolution: 192dpi)' },
				'ultra-hd': { 'raw': '(min-resolution: 300dpi)' },
			},
			fontFamily: {
				sans: ['Thmanyah Sans', 'Cairo', 'sans-serif'],
				tajawal: ['Thmanyah Sans', 'Cairo', 'sans-serif'],
				thmanyah: ['Thmanyah Sans', 'sans-serif'],
				cairo: ['Thmanyah Sans', 'Cairo', 'sans-serif'],
			},
			fontWeight: {
				normal: '400',
				medium: '400',
				semibold: '400',
				bold: '400',
				extrabold: '400',
				black: '400',
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
				book: {
					primary: 'hsl(var(--primary))',
					secondary: 'hsl(var(--secondary))',
					accent: 'hsl(var(--accent))',
					light: 'hsl(var(--card))',
					beige: 'hsl(var(--muted))',
					dark: 'hsl(var(--foreground))',
					title: 'hsl(var(--foreground))',
					author: 'hsl(var(--foreground))',
				},
				chat: {
					outgoing: 'hsl(var(--chat-outgoing))',
					'outgoing-foreground': 'hsl(var(--chat-outgoing-foreground))',
					incoming: 'hsl(var(--chat-incoming))',
					'incoming-foreground': 'hsl(var(--chat-incoming-foreground))',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			spacing: {
				'xs': '0.25rem',    // 4px
				'sm': '0.5rem',     // 8px  
				'md': '1rem',       // 16px
				'lg': '1.5rem',     // 24px
				'xl': '2rem',       // 32px
				'2xl': '3rem',      // 48px
				'3xl': '4rem',      // 64px
				'4xl': '6rem',      // 96px
				'5xl': '8rem',      // 128px
				'6xl': '12rem',     // 192px
				'safe-top': 'env(safe-area-inset-top)',
				'safe-bottom': 'env(safe-area-inset-bottom)',
				'safe-left': 'env(safe-area-inset-left)',
				'safe-right': 'env(safe-area-inset-right)',
			},
			fontSize: {
				'xxs': ['0.625rem', { lineHeight: '0.875rem' }],    // 10px
				'xs': ['0.75rem', { lineHeight: '1rem' }],          // 12px
				'sm': ['0.875rem', { lineHeight: '1.25rem' }],      // 14px
				'base': ['1rem', { lineHeight: '1.5rem' }],         // 16px
				'lg': ['1.125rem', { lineHeight: '1.75rem' }],      // 18px
				'xl': ['1.25rem', { lineHeight: '1.75rem' }],       // 20px
				'2xl': ['1.5rem', { lineHeight: '2rem' }],          // 24px
				'3xl': ['1.875rem', { lineHeight: '2.25rem' }],     // 30px
				'4xl': ['2.25rem', { lineHeight: '2.5rem' }],       // 36px
				'5xl': ['3rem', { lineHeight: '1' }],               // 48px
				'6xl': ['3.75rem', { lineHeight: '1' }],            // 60px
				'7xl': ['4.5rem', { lineHeight: '1' }],             // 72px
				'8xl': ['6rem', { lineHeight: '1' }],               // 96px
				'9xl': ['8rem', { lineHeight: '1' }],               // 128px
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'scale-in': {
					'0%': {
						transform: 'scale(0.95)',
						opacity: '0'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				},
				'slide-in': {
					'0%': {
						transform: 'translateX(100%)'
					},
					'100%': {
						transform: 'translateX(0)'
					}
				},
				'pulse': {
					'0%, 100%': {
						transform: 'scale(1)'
					},
					'50%': {
						transform: 'scale(1.05)'
					}
				},
				'bounce-subtle': {
					'0%, 100%': {
						transform: 'translateY(0)'
					},
					'50%': {
						transform: 'translateY(-2px)'
					}
				},
				'shimmer': {
					'0%': {
						backgroundPosition: '-200px 0'
					},
					'100%': {
						backgroundPosition: 'calc(200px + 100%) 0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-out forwards',
				'scale-in': 'scale-in 0.3s ease-out forwards',
				'slide-in': 'slide-in 0.3s ease-out forwards',
				'pulse': 'pulse 2s infinite',
				'bounce-subtle': 'bounce-subtle 1s ease-in-out infinite',
				'shimmer': 'shimmer 1.5s infinite'
			},
			gridTemplateColumns: {
				'auto-fit-xs': 'repeat(auto-fit, minmax(120px, 1fr))',
				'auto-fit-sm': 'repeat(auto-fit, minmax(160px, 1fr))',
				'auto-fit-md': 'repeat(auto-fit, minmax(200px, 1fr))',
				'auto-fit-lg': 'repeat(auto-fit, minmax(240px, 1fr))',
				'auto-fit-xl': 'repeat(auto-fit, minmax(280px, 1fr))',
			},
			maxWidth: {
				'xxs': '16rem',     // 256px
				'xs': '20rem',      // 320px
				'sm': '24rem',      // 384px
				'md': '28rem',      // 448px
				'lg': '32rem',      // 512px
				'xl': '36rem',      // 576px
				'2xl': '42rem',     // 672px
				'3xl': '48rem',     // 768px
				'4xl': '56rem',     // 896px
				'5xl': '64rem',     // 1024px
				'6xl': '72rem',     // 1152px
				'7xl': '80rem',     // 1280px
				'8xl': '96rem',     // 1536px
				'9xl': '120rem',    // 1920px
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
