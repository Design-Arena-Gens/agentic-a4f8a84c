import './globals.css';

export const metadata = {
  title: "Veo 3.1 Prompt Brain",
  description: "Transform messy ideas into structured, cinematic Veo 3.1 prompts"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
        <div className="container">
          <header className="header">
            <div className="title">Veo 3.1 Prompt Brain</div>
            <div className="chips">
              <span className="badge">Cinematic</span>
              <span className="badge">Consistent Characters</span>
              <span className="badge">High-Budget Look</span>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
