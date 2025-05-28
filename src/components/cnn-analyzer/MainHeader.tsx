
            // React component code with the updated logo
            import Image from 'next/image';
            // ... other imports ...
            export default function MainHeader({ reportType, outputType, isConfigSet }: MainHeaderProps) {
              return (
                <header className="p-4 mb-6 rounded-lg shadow-lg bg-card">
                  <div className="flex justify-between items-center">
                    <Image src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/CNN_International_logo.svg/1200px-CNN_International_logo.svg.png" alt="CNN Logo" width={80} height={40} data-ai-hint="news logo" />
                    <h1 className="text-2xl sm:text-3xl font-bold text-center text-primary">CNN Subscription Analyzer</h1>
                    <Image src="https://i.imgur.com/B4zCjNq.png" alt="BEYOND Insights Logo" width={100} height={50} data-ai-hint="company logo" />
                  </div>
                  {/* ... rest of the header ... */}
                </header>
              );
            }
            