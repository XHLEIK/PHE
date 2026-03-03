import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-amber-100">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">APPSC Redressal</h1>
        <p className="text-gray-600 mb-8">
          Welcome to the Next-Gen Multilingual Grievance Redressal System.
        </p>
        <Link 
          href="/complaint"
          className="inline-block w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          Submit a Complaint
        </Link>
      </div>
    </main>
  );
}
