import React from 'react';
import ComplaintForm from '@/components/ComplaintForm';

export const metadata = {
  title: 'Submit Complaint | APPSC Grievance Redressal',
  description: 'Submit your grievance to APPSC for quick resolution.',
};

const ComplaintPage = () => {
  return (
    <main className="min-h-screen bg-[#faf9f6] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-purple-100 rounded-full mb-4">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="text-purple-600"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
            Candidate Complaint Submission
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Please fill out the form below to register your complaint. Our AI-assisted system will ensure it reaches the right department with the correct priority.
          </p>
        </div>

        {/* Form Section */}
        <div className="relative">
          {/* Decorative elements */}
          <div className="absolute -top-6 -left-6 w-12 h-12 bg-amber-100 rounded-full opacity-50 blur-xl"></div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-purple-100 rounded-full opacity-50 blur-xl"></div>
          
          <ComplaintForm />
        </div>

        {/* Footer/Help Link */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Need help? Check our <a href="#" className="text-purple-600 font-semibold hover:underline">FAQ</a> or <a href="#" className="text-purple-600 font-semibold hover:underline">Contact Support</a></p>
          <div className="mt-8 flex justify-center items-center gap-6 opacity-60">
            <span className="font-bold text-gray-400">APPSC</span>
            <span className="h-4 w-px bg-gray-300"></span>
            <span className="text-xs uppercase tracking-widest font-semibold">Government of Arunachal Pradesh</span>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ComplaintPage;
