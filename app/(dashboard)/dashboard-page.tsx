import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      {/* Simple Navigation */}
      <nav className="bg-white border-b border-gray-200 mb-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold">ThinkTapFast</h1>
              <div className="flex space-x-4">
                <Link 
                  href="/" 
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/billing" 
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Billing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4">
        <div className="grid min-h-[60vh] grid-rows-[1fr_auto] items-center justify-items-center gap-16">
          <main className="flex flex-col items-center gap-[32px] sm:items-start">
            <Image
              className="dark:invert"
              src="/next.svg"
              alt="Next.js logo"
              width={180}
              height={38}
              priority
            />
            <div className="text-center sm:text-left space-y-4">
              <h2 className="text-2xl font-bold">Welcome to ThinkTapFast Dashboard</h2>
              <p className="text-gray-600">Manage your content generation and billing from here.</p>
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Link
                className="bg-blue-600 text-white flex h-10 items-center justify-center gap-2 rounded-lg px-6 text-sm font-medium transition-colors hover:bg-blue-700"
                href="/billing"
              >
                View Billing Dashboard
              </Link>
              <Link
                className="border border-gray-300 text-gray-700 flex h-10 items-center justify-center gap-2 rounded-lg px-6 text-sm font-medium transition-colors hover:bg-gray-50"
                href="/content/generate"
              >
                Generate Content
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
