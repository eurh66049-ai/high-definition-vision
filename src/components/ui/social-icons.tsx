
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QRCodeComponent } from '@/components/ui/qr-code';

interface SocialIconProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circle' | 'pill';
  size?: 'sm' | 'md' | 'lg';
  hideIcons?: boolean;
  shareData?: {
    title: string;
    text: string;
    url: string;
  };
}

export const SocialIcons: React.FC<SocialIconProps> = ({
  className,
  variant = 'default',
  size = 'md',
  hideIcons = false,
  shareData,
  ...props
}) => {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  
  if (hideIcons) return null;
  
  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };
  
  const containerStyles = {
    default: 'flex gap-3 items-center',
    circle: 'flex gap-3 items-center',
    pill: 'flex gap-3 items-center bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-md',
  };

  const iconStyles = {
    default: `transition-colors duration-200`,
    circle: `rounded-full p-3 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-110`,
    pill: `transition-transform duration-200 hover:scale-110`,
  };

  const handleShare = (platform: string) => {
    if (!shareData) return;
    
    const { title, text, url } = shareData;
    const encodedTitle = encodeURIComponent(title);
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);
    
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedUrl}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  return (
    <div 
      className={cn(containerStyles[variant], className)}
      dir="ltr"
      {...props}
    >
      {/* Facebook */}
      <button 
        onClick={() => handleShare('facebook')}
        className={cn(
          iconStyles[variant],
          variant === 'circle' ? 'bg-blue-50 hover:bg-blue-100' : 'hover:opacity-80',
          'transition-all duration-200'
        )}
        aria-label="مشاركة على فيسبوك"
      >
        <svg 
          className={cn(iconSize[size])} 
          viewBox="0 0 408.788 408.788"
        >
          <path 
            fill="#475993" 
            d="M353.701,0H55.087C24.665,0,0.002,24.662,0.002,55.085v298.616c0,30.423,24.662,55.085,55.085,55.085
	h147.275l0.251-146.078h-37.951c-4.932,0-8.935-3.988-8.954-8.92l-0.182-47.087c-0.019-4.959,3.996-8.989,8.955-8.989h37.882
	v-45.498c0-52.8,32.247-81.55,79.348-81.55h38.65c4.945,0,8.955,4.009,8.955,8.955v39.704c0,4.944-4.007,8.952-8.95,8.955
	l-23.719,0.011c-25.615,0-30.575,12.172-30.575,30.035v39.389h56.285c5.363,0,9.524,4.683,8.892,10.009l-5.581,47.087
	c-0.534,4.506-4.355,7.901-8.892,7.901h-50.453l-0.251,146.078h87.631c30.422,0,55.084-24.662,55.084-55.084V55.085
	C408.786,24.662,384.124,0,353.701,0z"
          />
        </svg>
      </button>
      
      {/* X (Twitter) */}
      <button 
        onClick={() => handleShare('twitter')}
        className={cn(
          iconStyles[variant],
          variant === 'circle' ? 'bg-blue-50 hover:bg-blue-100' : 'hover:opacity-80',
          'transition-all duration-200'
        )}
        aria-label="مشاركة على تويتر"
      >
        <svg 
          className={cn(iconSize[size])} 
          viewBox="0 0 410.155 410.155"
        >
          <path 
            fill="#76A9EA" 
            d="M403.632,74.18c-9.113,4.041-18.573,7.229-28.28,9.537c10.696-10.164,18.738-22.877,23.275-37.067
	l0,0c1.295-4.051-3.105-7.554-6.763-5.385l0,0c-13.504,8.01-28.05,14.019-43.235,17.862c-0.881,0.223-1.79,0.336-2.702,0.336
	c-2.766,0-5.455-1.027-7.57-2.891c-16.156-14.239-36.935-22.081-58.508-22.081c-9.335,0-18.76,1.455-28.014,4.325
	c-28.672,8.893-50.795,32.544-57.736,61.724c-2.604,10.945-3.309,21.9-2.097,32.56c0.139,1.225-0.44,2.08-0.797,2.481
	c-0.627,0.703-1.516,1.106-2.439,1.106c-0.103,0-0.209-0.005-0.314-0.015c-62.762-5.831-119.358-36.068-159.363-85.14l0,0
	c-2.04-2.503-5.952-2.196-7.578,0.593l0,0C13.677,65.565,9.537,80.937,9.537,96.579c0,23.972,9.631,46.563,26.36,63.032
	c-7.035-1.668-13.844-4.295-20.169-7.808l0,0c-3.06-1.7-6.825,0.485-6.868,3.985l0,0c-0.438,35.612,20.412,67.3,51.646,81.569
	c-0.629,0.015-1.258,0.022-1.888,0.022c-4.951,0-9.964-0.478-14.898-1.421l0,0c-3.446-0.658-6.341,2.611-5.271,5.952l0,0
	c10.138,31.651,37.39,54.981,70.002,60.278c-27.066,18.169-58.585,27.753-91.39,27.753l-10.227-0.006
	c-3.151,0-5.816,2.054-6.619,5.106c-0.791,3.006,0.666,6.177,3.353,7.74c36.966,21.513,79.131,32.883,121.955,32.883
	c37.485,0,72.549-7.439,104.219-22.109c29.033-13.449,54.689-32.674,76.255-57.141c20.09-22.792,35.8-49.103,46.692-78.201
	c10.383-27.737,15.871-57.333,15.871-85.589v-1.346c-0.001-4.537,2.051-8.806,5.631-11.712c13.585-11.03,25.415-24.014,35.16-38.591
	l0,0C411.924,77.126,407.866,72.302,403.632,74.18L403.632,74.18z"
          />
        </svg>
      </button>
      
      {/* WhatsApp */}
      <button 
        onClick={() => handleShare('whatsapp')}
        className={cn(
          iconStyles[variant],
          variant === 'circle' ? 'bg-green-50 hover:bg-green-100' : 'hover:opacity-80',
          'transition-all duration-200'
        )}
        aria-label="مشاركة على واتساب"
      >
        <svg 
          className={cn(iconSize[size])} 
          viewBox="0 0 418.135 418.135"
        >
          <path 
            fill="#7AD06D" 
            d="M198.929,0.242C88.5,5.5,1.356,97.466,1.691,208.02c0.102,33.672,8.231,65.454,22.571,93.536
		L2.245,408.429c-1.191,5.781,4.023,10.843,9.766,9.483l104.723-24.811c26.905,13.402,57.125,21.143,89.108,21.631
		c112.869,1.724,206.982-87.897,210.5-200.724C420.113,93.065,320.295-5.538,198.929,0.242z M323.886,322.197
		c-30.669,30.669-71.446,47.559-114.818,47.559c-25.396,0-49.71-5.698-72.269-16.935l-14.584-7.265l-64.206,15.212l13.515-65.607
		l-7.185-14.07c-11.711-22.935-17.649-47.736-17.649-73.713c0-43.373,16.89-84.149,47.559-114.819
		c30.395-30.395,71.837-47.56,114.822-47.56C252.443,45,293.218,61.89,323.887,92.558c30.669,30.669,47.559,71.445,47.56,114.817
		C371.446,250.361,354.281,291.803,323.886,322.197z"
          />
          <path 
            fill="#7AD06D" 
            d="M309.712,252.351l-40.169-11.534c-5.281-1.516-10.968-0.018-14.816,3.903l-9.823,10.008
		c-4.142,4.22-10.427,5.576-15.909,3.358c-19.002-7.69-58.974-43.23-69.182-61.007c-2.945-5.128-2.458-11.539,1.158-16.218
		l8.576-11.095c3.36-4.347,4.069-10.185,1.847-15.21l-16.9-38.223c-4.048-9.155-15.747-11.82-23.39-5.356
		c-11.211,9.482-24.513,23.891-26.13,39.854c-2.851,28.144,9.219,63.622,54.862,106.222c52.73,49.215,94.956,55.717,122.449,49.057
		c15.594-3.777,28.056-18.919,35.921-31.317C323.568,266.34,319.334,255.114,309.712,252.351z"
          />
        </svg>
      </button>
      
      {/* QR Code */}
      {shareData && (
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogTrigger asChild>
            <button 
              className={cn(
                iconStyles[variant],
                variant === 'circle' ? 'bg-purple-50 hover:bg-purple-100' : 'hover:opacity-80',
                'transition-all duration-200'
              )}
              aria-label="عرض رمز QR"
            >
              <svg 
                className={cn(iconSize[size])} 
                viewBox="0 0 256 256"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <clipPath id="clip-path-dot-color">
                    <circle cx="16" cy="88" r="4" transform="rotate(0,16,88)"/>
                    <circle cx="16" cy="96" r="4" transform="rotate(0,16,96)"/>
                    <circle cx="16" cy="112" r="4" transform="rotate(0,16,112)"/>
                    <circle cx="16" cy="136" r="4" transform="rotate(0,16,136)"/>
                    <circle cx="16" cy="144" r="4" transform="rotate(0,16,144)"/>
                    <circle cx="16" cy="152" r="4" transform="rotate(0,16,152)"/>
                    <circle cx="16" cy="160" r="4" transform="rotate(0,16,160)"/>
                    <circle cx="24" cy="80" r="4" transform="rotate(0,24,80)"/>
                    <circle cx="24" cy="96" r="4" transform="rotate(0,24,96)"/>
                    <circle cx="24" cy="104" r="4" transform="rotate(0,24,104)"/>
                    <circle cx="24" cy="120" r="4" transform="rotate(0,24,120)"/>
                    <circle cx="24" cy="128" r="4" transform="rotate(0,24,128)"/>
                    <circle cx="24" cy="136" r="4" transform="rotate(0,24,136)"/>
                    <circle cx="24" cy="152" r="4" transform="rotate(0,24,152)"/>
                    <circle cx="24" cy="168" r="4" transform="rotate(0,24,168)"/>
                    <circle cx="32" cy="88" r="4" transform="rotate(0,32,88)"/>
                    <circle cx="32" cy="104" r="4" transform="rotate(0,32,104)"/>
                    <circle cx="32" cy="120" r="4" transform="rotate(0,32,120)"/>
                    <circle cx="32" cy="128" r="4" transform="rotate(0,32,128)"/>
                    <circle cx="32" cy="152" r="4" transform="rotate(0,32,152)"/>
                    <circle cx="32" cy="168" r="4" transform="rotate(0,32,168)"/>
                    <circle cx="32" cy="176" r="4" transform="rotate(0,32,176)"/>
                    <circle cx="40" cy="88" r="4" transform="rotate(0,40,88)"/>
                    <circle cx="40" cy="96" r="4" transform="rotate(0,40,96)"/>
                    <circle cx="40" cy="136" r="4" transform="rotate(0,40,136)"/>
                    <circle cx="40" cy="160" r="4" transform="rotate(0,40,160)"/>
                    <circle cx="40" cy="168" r="4" transform="rotate(0,40,168)"/>
                    <circle cx="48" cy="88" r="4" transform="rotate(0,48,88)"/>
                    <circle cx="48" cy="104" r="4" transform="rotate(0,48,104)"/>
                    <circle cx="48" cy="120" r="4" transform="rotate(0,48,120)"/>
                    <circle cx="48" cy="128" r="4" transform="rotate(0,48,128)"/>
                    <circle cx="48" cy="144" r="4" transform="rotate(0,48,144)"/>
                    <circle cx="48" cy="152" r="4" transform="rotate(0,48,152)"/>
                    <circle cx="48" cy="160" r="4" transform="rotate(0,48,160)"/>
                    <circle cx="56" cy="80" r="4" transform="rotate(0,56,80)"/>
                    <circle cx="56" cy="88" r="4" transform="rotate(0,56,88)"/>
                    <circle cx="56" cy="96" r="4" transform="rotate(0,56,96)"/>
                    <circle cx="56" cy="120" r="4" transform="rotate(0,56,120)"/>
                    <circle cx="56" cy="128" r="4" transform="rotate(0,56,128)"/>
                    <circle cx="56" cy="144" r="4" transform="rotate(0,56,144)"/>
                    <circle cx="56" cy="168" r="4" transform="rotate(0,56,168)"/>
                    <circle cx="64" cy="80" r="4" transform="rotate(0,64,80)"/>
                    <circle cx="64" cy="96" r="4" transform="rotate(0,64,96)"/>
                    <circle cx="64" cy="112" r="4" transform="rotate(0,64,112)"/>
                    <circle cx="64" cy="128" r="4" transform="rotate(0,64,128)"/>
                    <circle cx="64" cy="144" r="4" transform="rotate(0,64,144)"/>
                    <circle cx="64" cy="160" r="4" transform="rotate(0,64,160)"/>
                    <circle cx="64" cy="176" r="4" transform="rotate(0,64,176)"/>
                    <circle cx="72" cy="80" r="4" transform="rotate(0,72,80)"/>
                    <circle cx="72" cy="96" r="4" transform="rotate(0,72,96)"/>
                    <circle cx="72" cy="128" r="4" transform="rotate(0,72,128)"/>
                    <circle cx="72" cy="152" r="4" transform="rotate(0,72,152)"/>
                    <circle cx="72" cy="160" r="4" transform="rotate(0,72,160)"/>
                    <circle cx="80" cy="48" r="4" transform="rotate(0,80,48)"/>
                    <circle cx="80" cy="56" r="4" transform="rotate(0,80,56)"/>
                    <circle cx="80" cy="64" r="4" transform="rotate(0,80,64)"/>
                    <circle cx="80" cy="72" r="4" transform="rotate(0,80,72)"/>
                    <circle cx="80" cy="112" r="4" transform="rotate(0,80,112)"/>
                    <circle cx="80" cy="136" r="4" transform="rotate(0,80,136)"/>
                    <circle cx="80" cy="160" r="4" transform="rotate(0,80,160)"/>
                    <circle cx="80" cy="176" r="4" transform="rotate(0,80,176)"/>
                    <circle cx="80" cy="192" r="4" transform="rotate(0,80,192)"/>
                    <circle cx="80" cy="200" r="4" transform="rotate(0,80,200)"/>
                    <circle cx="80" cy="232" r="4" transform="rotate(0,80,232)"/>
                    <circle cx="88" cy="184" r="4" transform="rotate(0,88,184)"/>
                    <circle cx="88" cy="192" r="4" transform="rotate(0,88,192)"/>
                    <circle cx="88" cy="200" r="4" transform="rotate(0,88,200)"/>
                    <circle cx="88" cy="208" r="4" transform="rotate(0,88,208)"/>
                    <circle cx="88" cy="216" r="4" transform="rotate(0,88,216)"/>
                    <circle cx="88" cy="224" r="4" transform="rotate(0,88,224)"/>
                    <circle cx="88" cy="232" r="4" transform="rotate(0,88,232)"/>
                    <circle cx="88" cy="240" r="4" transform="rotate(0,88,240)"/>
                    <circle cx="96" cy="16" r="4" transform="rotate(0,96,16)"/>
                    <circle cx="96" cy="24" r="4" transform="rotate(0,96,24)"/>
                    <circle cx="96" cy="48" r="4" transform="rotate(0,96,48)"/>
                    <circle cx="96" cy="56" r="4" transform="rotate(0,96,56)"/>
                    <circle cx="96" cy="64" r="4" transform="rotate(0,96,64)"/>
                    <circle cx="96" cy="176" r="4" transform="rotate(0,96,176)"/>
                    <circle cx="96" cy="184" r="4" transform="rotate(0,96,184)"/>
                    <circle cx="96" cy="224" r="4" transform="rotate(0,96,224)"/>
                    <circle cx="96" cy="240" r="4" transform="rotate(0,96,240)"/>
                    <circle cx="104" cy="48" r="4" transform="rotate(0,104,48)"/>
                    <circle cx="104" cy="56" r="4" transform="rotate(0,104,56)"/>
                    <circle cx="104" cy="72" r="4" transform="rotate(0,104,72)"/>
                    <circle cx="104" cy="80" r="4" transform="rotate(0,104,80)"/>
                    <circle cx="104" cy="184" r="4" transform="rotate(0,104,184)"/>
                    <circle cx="104" cy="216" r="4" transform="rotate(0,104,216)"/>
                    <circle cx="104" cy="232" r="4" transform="rotate(0,104,232)"/>
                    <circle cx="104" cy="240" r="4" transform="rotate(0,104,240)"/>
                    <circle cx="112" cy="32" r="4" transform="rotate(0,112,32)"/>
                    <circle cx="112" cy="64" r="4" transform="rotate(0,112,64)"/>
                    <circle cx="112" cy="80" r="4" transform="rotate(0,112,80)"/>
                    <circle cx="112" cy="176" r="4" transform="rotate(0,112,176)"/>
                    <circle cx="112" cy="200" r="4" transform="rotate(0,112,200)"/>
                    <circle cx="112" cy="216" r="4" transform="rotate(0,112,216)"/>
                    <circle cx="112" cy="240" r="4" transform="rotate(0,112,240)"/>
                    <circle cx="120" cy="16" r="4" transform="rotate(0,120,16)"/>
                    <circle cx="120" cy="24" r="4" transform="rotate(0,120,24)"/>
                    <circle cx="120" cy="32" r="4" transform="rotate(0,120,32)"/>
                    <circle cx="120" cy="40" r="4" transform="rotate(0,120,40)"/>
                    <circle cx="120" cy="48" r="4" transform="rotate(0,120,48)"/>
                    <circle cx="120" cy="72" r="4" transform="rotate(0,120,72)"/>
                    <circle cx="120" cy="80" r="4" transform="rotate(0,120,80)"/>
                    <circle cx="120" cy="192" r="4" transform="rotate(0,120,192)"/>
                    <circle cx="120" cy="208" r="4" transform="rotate(0,120,208)"/>
                    <circle cx="120" cy="224" r="4" transform="rotate(0,120,224)"/>
                    <circle cx="120" cy="232" r="4" transform="rotate(0,120,232)"/>
                    <circle cx="120" cy="240" r="4" transform="rotate(0,120,240)"/>
                    <circle cx="128" cy="48" r="4" transform="rotate(0,128,48)"/>
                    <circle cx="128" cy="64" r="4" transform="rotate(0,128,64)"/>
                    <circle cx="128" cy="184" r="4" transform="rotate(0,128,184)"/>
                    <circle cx="128" cy="192" r="4" transform="rotate(0,128,192)"/>
                    <circle cx="128" cy="208" r="4" transform="rotate(0,128,208)"/>
                    <circle cx="128" cy="240" r="4" transform="rotate(0,128,240)"/>
                    <circle cx="136" cy="24" r="4" transform="rotate(0,136,24)"/>
                    <circle cx="136" cy="48" r="4" transform="rotate(0,136,48)"/>
                    <circle cx="136" cy="56" r="4" transform="rotate(0,136,56)"/>
                    <circle cx="136" cy="80" r="4" transform="rotate(0,136,80)"/>
                    <circle cx="136" cy="176" r="4" transform="rotate(0,136,176)"/>
                    <circle cx="136" cy="184" r="4" transform="rotate(0,136,184)"/>
                    <circle cx="136" cy="200" r="4" transform="rotate(0,136,200)"/>
                    <circle cx="136" cy="216" r="4" transform="rotate(0,136,216)"/>
                    <circle cx="136" cy="232" r="4" transform="rotate(0,136,232)"/>
                    <circle cx="144" cy="16" r="4" transform="rotate(0,144,16)"/>
                    <circle cx="144" cy="32" r="4" transform="rotate(0,144,32)"/>
                    <circle cx="144" cy="56" r="4" transform="rotate(0,144,56)"/>
                    <circle cx="144" cy="64" r="4" transform="rotate(0,144,64)"/>
                    <circle cx="144" cy="80" r="4" transform="rotate(0,144,80)"/>
                    <circle cx="144" cy="176" r="4" transform="rotate(0,144,176)"/>
                    <circle cx="144" cy="184" r="4" transform="rotate(0,144,184)"/>
                    <circle cx="152" cy="16" r="4" transform="rotate(0,152,16)"/>
                    <circle cx="152" cy="32" r="4" transform="rotate(0,152,32)"/>
                    <circle cx="152" cy="40" r="4" transform="rotate(0,152,40)"/>
                    <circle cx="152" cy="48" r="4" transform="rotate(0,152,48)"/>
                    <circle cx="152" cy="56" r="4" transform="rotate(0,152,56)"/>
                    <circle cx="152" cy="80" r="4" transform="rotate(0,152,80)"/>
                    <circle cx="152" cy="184" r="4" transform="rotate(0,152,184)"/>
                    <circle cx="152" cy="192" r="4" transform="rotate(0,152,192)"/>
                    <circle cx="152" cy="200" r="4" transform="rotate(0,152,200)"/>
                    <circle cx="152" cy="208" r="4" transform="rotate(0,152,208)"/>
                    <circle cx="152" cy="224" r="4" transform="rotate(0,152,224)"/>
                    <circle cx="152" cy="240" r="4" transform="rotate(0,152,240)"/>
                    <circle cx="160" cy="40" r="4" transform="rotate(0,160,40)"/>
                    <circle cx="160" cy="48" r="4" transform="rotate(0,160,48)"/>
                    <circle cx="160" cy="64" r="4" transform="rotate(0,160,64)"/>
                    <circle cx="160" cy="208" r="4" transform="rotate(0,160,208)"/>
                    <circle cx="160" cy="216" r="4" transform="rotate(0,160,216)"/>
                    <circle cx="160" cy="240" r="4" transform="rotate(0,160,240)"/>
                    <circle cx="168" cy="56" r="4" transform="rotate(0,168,56)"/>
                    <circle cx="168" cy="80" r="4" transform="rotate(0,168,80)"/>
                    <circle cx="168" cy="176" r="4" transform="rotate(0,168,176)"/>
                    <circle cx="168" cy="200" r="4" transform="rotate(0,168,200)"/>
                    <circle cx="168" cy="208" r="4" transform="rotate(0,168,208)"/>
                    <circle cx="168" cy="216" r="4" transform="rotate(0,168,216)"/>
                    <circle cx="168" cy="232" r="4" transform="rotate(0,168,232)"/>
                    <circle cx="168" cy="240" r="4" transform="rotate(0,168,240)"/>
                    <circle cx="176" cy="16" r="4" transform="rotate(0,176,16)"/>
                    <circle cx="176" cy="24" r="4" transform="rotate(0,176,24)"/>
                    <circle cx="176" cy="48" r="4" transform="rotate(0,176,48)"/>
                    <circle cx="176" cy="56" r="4" transform="rotate(0,176,56)"/>
                    <circle cx="176" cy="64" r="4" transform="rotate(0,176,64)"/>
                    <circle cx="176" cy="104" r="4" transform="rotate(0,176,104)"/>
                    <circle cx="176" cy="120" r="4" transform="rotate(0,176,120)"/>
                    <circle cx="176" cy="176" r="4" transform="rotate(0,176,176)"/>
                    <circle cx="176" cy="184" r="4" transform="rotate(0,176,184)"/>
                    <circle cx="176" cy="192" r="4" transform="rotate(0,176,192)"/>
                    <circle cx="176" cy="200" r="4" transform="rotate(0,176,200)"/>
                    <circle cx="176" cy="208" r="4" transform="rotate(0,176,208)"/>
                    <circle cx="176" cy="216" r="4" transform="rotate(0,176,216)"/>
                    <circle cx="176" cy="240" r="4" transform="rotate(0,176,240)"/>
                    <circle cx="184" cy="80" r="4" transform="rotate(0,184,80)"/>
                    <circle cx="184" cy="88" r="4" transform="rotate(0,184,88)"/>
                    <circle cx="184" cy="96" r="4" transform="rotate(0,184,96)"/>
                    <circle cx="184" cy="104" r="4" transform="rotate(0,184,104)"/>
                    <circle cx="184" cy="120" r="4" transform="rotate(0,184,120)"/>
                    <circle cx="184" cy="152" r="4" transform="rotate(0,184,152)"/>
                    <circle cx="184" cy="160" r="4" transform="rotate(0,184,160)"/>
                    <circle cx="184" cy="168" r="4" transform="rotate(0,184,168)"/>
                    <circle cx="184" cy="176" r="4" transform="rotate(0,184,176)"/>
                    <circle cx="184" cy="208" r="4" transform="rotate(0,184,208)"/>
                    <circle cx="184" cy="224" r="4" transform="rotate(0,184,224)"/>
                    <circle cx="184" cy="240" r="4" transform="rotate(0,184,240)"/>
                    <circle cx="192" cy="80" r="4" transform="rotate(0,192,80)"/>
                    <circle cx="192" cy="112" r="4" transform="rotate(0,192,112)"/>
                    <circle cx="192" cy="136" r="4" transform="rotate(0,192,136)"/>
                    <circle cx="192" cy="144" r="4" transform="rotate(0,192,144)"/>
                    <circle cx="192" cy="160" r="4" transform="rotate(0,192,160)"/>
                    <circle cx="192" cy="168" r="4" transform="rotate(0,192,168)"/>
                    <circle cx="192" cy="176" r="4" transform="rotate(0,192,176)"/>
                    <circle cx="192" cy="192" r="4" transform="rotate(0,192,192)"/>
                    <circle cx="192" cy="208" r="4" transform="rotate(0,192,208)"/>
                    <circle cx="192" cy="240" r="4" transform="rotate(0,192,240)"/>
                    <circle cx="200" cy="80" r="4" transform="rotate(0,200,80)"/>
                    <circle cx="200" cy="104" r="4" transform="rotate(0,200,104)"/>
                    <circle cx="200" cy="112" r="4" transform="rotate(0,200,112)"/>
                    <circle cx="200" cy="168" r="4" transform="rotate(0,200,168)"/>
                    <circle cx="200" cy="176" r="4" transform="rotate(0,200,176)"/>
                    <circle cx="200" cy="208" r="4" transform="rotate(0,200,208)"/>
                    <circle cx="200" cy="216" r="4" transform="rotate(0,200,216)"/>
                    <circle cx="208" cy="80" r="4" transform="rotate(0,208,80)"/>
                    <circle cx="208" cy="104" r="4" transform="rotate(0,208,104)"/>
                    <circle cx="208" cy="128" r="4" transform="rotate(0,208,128)"/>
                    <circle cx="208" cy="136" r="4" transform="rotate(0,208,136)"/>
                    <circle cx="208" cy="160" r="4" transform="rotate(0,208,160)"/>
                    <circle cx="208" cy="168" r="4" transform="rotate(0,208,168)"/>
                    <circle cx="208" cy="176" r="4" transform="rotate(0,208,176)"/>
                    <circle cx="208" cy="184" r="4" transform="rotate(0,208,184)"/>
                    <circle cx="208" cy="192" r="4" transform="rotate(0,208,192)"/>
                    <circle cx="208" cy="200" r="4" transform="rotate(0,208,200)"/>
                    <circle cx="208" cy="208" r="4" transform="rotate(0,208,208)"/>
                    <circle cx="208" cy="240" r="4" transform="rotate(0,208,240)"/>
                    <circle cx="216" cy="88" r="4" transform="rotate(0,216,88)"/>
                    <circle cx="216" cy="96" r="4" transform="rotate(0,216,96)"/>
                    <circle cx="216" cy="112" r="4" transform="rotate(0,216,112)"/>
                    <circle cx="216" cy="120" r="4" transform="rotate(0,216,120)"/>
                    <circle cx="216" cy="128" r="4" transform="rotate(0,216,128)"/>
                    <circle cx="216" cy="136" r="4" transform="rotate(0,216,136)"/>
                    <circle cx="216" cy="144" r="4" transform="rotate(0,216,144)"/>
                    <circle cx="216" cy="152" r="4" transform="rotate(0,216,152)"/>
                    <circle cx="216" cy="200" r="4" transform="rotate(0,216,200)"/>
                    <circle cx="216" cy="216" r="4" transform="rotate(0,216,216)"/>
                    <circle cx="216" cy="224" r="4" transform="rotate(0,216,224)"/>
                    <circle cx="216" cy="232" r="4" transform="rotate(0,216,232)"/>
                    <circle cx="224" cy="104" r="4" transform="rotate(0,224,104)"/>
                    <circle cx="224" cy="120" r="4" transform="rotate(0,224,120)"/>
                    <circle cx="224" cy="128" r="4" transform="rotate(0,224,128)"/>
                    <circle cx="224" cy="136" r="4" transform="rotate(0,224,136)"/>
                    <circle cx="224" cy="144" r="4" transform="rotate(0,224,144)"/>
                    <circle cx="224" cy="160" r="4" transform="rotate(0,224,160)"/>
                    <circle cx="224" cy="168" r="4" transform="rotate(0,224,168)"/>
                    <circle cx="224" cy="176" r="4" transform="rotate(0,224,176)"/>
                    <circle cx="224" cy="184" r="4" transform="rotate(0,224,184)"/>
                    <circle cx="224" cy="216" r="4" transform="rotate(0,224,216)"/>
                    <circle cx="224" cy="232" r="4" transform="rotate(0,224,232)"/>
                    <circle cx="224" cy="240" r="4" transform="rotate(0,224,240)"/>
                    <circle cx="232" cy="88" r="4" transform="rotate(0,232,88)"/>
                    <circle cx="232" cy="96" r="4" transform="rotate(0,232,96)"/>
                    <circle cx="232" cy="112" r="4" transform="rotate(0,232,112)"/>
                    <circle cx="232" cy="120" r="4" transform="rotate(0,232,120)"/>
                    <circle cx="232" cy="128" r="4" transform="rotate(0,232,128)"/>
                    <circle cx="232" cy="136" r="4" transform="rotate(0,232,136)"/>
                    <circle cx="232" cy="144" r="4" transform="rotate(0,232,144)"/>
                    <circle cx="232" cy="152" r="4" transform="rotate(0,232,152)"/>
                    <circle cx="232" cy="160" r="4" transform="rotate(0,232,160)"/>
                    <circle cx="232" cy="176" r="4" transform="rotate(0,232,176)"/>
                    <circle cx="232" cy="184" r="4" transform="rotate(0,232,184)"/>
                    <circle cx="232" cy="192" r="4" transform="rotate(0,232,192)"/>
                    <circle cx="232" cy="200" r="4" transform="rotate(0,232,200)"/>
                    <circle cx="232" cy="216" r="4" transform="rotate(0,232,216)"/>
                    <circle cx="232" cy="232" r="4" transform="rotate(0,232,232)"/>
                    <circle cx="232" cy="240" r="4" transform="rotate(0,232,240)"/>
                    <circle cx="240" cy="88" r="4" transform="rotate(0,240,88)"/>
                    <circle cx="240" cy="128" r="4" transform="rotate(0,240,128)"/>
                    <circle cx="240" cy="136" r="4" transform="rotate(0,240,136)"/>
                    <circle cx="240" cy="168" r="4" transform="rotate(0,240,168)"/>
                    <circle cx="240" cy="176" r="4" transform="rotate(0,240,176)"/>
                    <circle cx="240" cy="184" r="4" transform="rotate(0,240,184)"/>
                    <circle cx="240" cy="192" r="4" transform="rotate(0,240,192)"/>
                    <circle cx="240" cy="208" r="4" transform="rotate(0,240,208)"/>
                    <circle cx="240" cy="216" r="4" transform="rotate(0,240,216)"/>
                    <circle cx="240" cy="232" r="4" transform="rotate(0,240,232)"/>
                  </clipPath>
                  <clipPath id="clip-path-corners-square-color-0-0">
                    <path clipRule="evenodd" d="M 12 32v 16a 20 20, 0, 0, 0, 20 20h 16a 20 20, 0, 0, 0, 20 -20v -16a 20 20, 0, 0, 0, -20 -20h -16a 20 20, 0, 0, 0, -20 20M 32 20h 16a 12 12, 0, 0, 1, 12 12v 16a 12 12, 0, 0, 1, -12 12h -16a 12 12, 0, 0, 1, -12 -12v -16a 12 12, 0, 0, 1, 12 -12" transform="rotate(0,40,40)"/>
                  </clipPath>
                  <clipPath id="clip-path-corners-dot-color-0-0">
                    <circle cx="40" cy="40" r="12" transform="rotate(0,40,40)"/>
                  </clipPath>
                  <clipPath id="clip-path-corners-square-color-1-0">
                    <path clipRule="evenodd" d="M 188 32v 16a 20 20, 0, 0, 0, 20 20h 16a 20 20, 0, 0, 0, 20 -20v -16a 20 20, 0, 0, 0, -20 -20h -16a 20 20, 0, 0, 0, -20 20M 208 20h 16a 12 12, 0, 0, 1, 12 12v 16a 12 12, 0, 0, 1, -12 12h -16a 12 12, 0, 0, 1, -12 -12v -16a 12 12, 0, 0, 1, 12 -12" transform="rotate(90,216,40)"/>
                  </clipPath>
                  <clipPath id="clip-path-corners-dot-color-1-0">
                    <circle cx="216" cy="40" r="12" transform="rotate(90,216,40)"/>
                  </clipPath>
                  <clipPath id="clip-path-corners-square-color-0-1">
                    <path clipRule="evenodd" d="M 12 208v 16a 20 20, 0, 0, 0, 20 20h 16a 20 20, 0, 0, 0, 20 -20v -16a 20 20, 0, 0, 0, -20 -20h -16a 20 20, 0, 0, 0, -20 20M 32 196h 16a 12 12, 0, 0, 1, 12 12v 16a 12 12, 0, 0, 1, -12 12h -16a 12 12, 0, 0, 1, -12 -12v -16a 12 12, 0, 0, 1, 12 -12" transform="rotate(-90,40,216)"/>
                  </clipPath>
                  <clipPath id="clip-path-corners-dot-color-0-1">
                    <circle cx="40" cy="216" r="12" transform="rotate(-90,40,216)"/>
                  </clipPath>
                </defs>
                <rect x="0" y="0" height="256" width="256" clipPath="url('#clip-path-background-color')" fill="transparent"/>
                <rect x="0" y="0" height="256" width="256" clipPath="url('#clip-path-dot-color')" fill="#000000"/>
                <rect x="12" y="12" height="56" width="56" clipPath="url('#clip-path-corners-square-color-0-0')" fill="#9333ea"/>
                <rect x="28" y="28" height="24" width="24" clipPath="url('#clip-path-corners-dot-color-0-0')" fill="#a855f7"/>
                <rect x="188" y="12" height="56" width="56" clipPath="url('#clip-path-corners-square-color-1-0')" fill="#9333ea"/>
                <rect x="204" y="28" height="24" width="24" clipPath="url('#clip-path-corners-dot-color-1-0')" fill="#a855f7"/>
                <rect x="12" y="188" height="56" width="56" clipPath="url('#clip-path-corners-square-color-0-1')" fill="#9333ea"/>
                <rect x="28" y="204" height="24" width="24" clipPath="url('#clip-path-corners-dot-color-0-1')" fill="#a855f7"/>
              </svg>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center font-amiri">
                رمز QR للكتاب
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4 p-4">
              <QRCodeComponent 
                value={shareData.url} 
                size={250}
                className="border rounded-lg p-2 bg-white"
              />
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-cairo">
                  امسح الرمز بالكاميرا لفتح رابط الكتاب
                </p>
                <p className="text-xs text-gray-500 font-cairo">
                  {shareData.title}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
