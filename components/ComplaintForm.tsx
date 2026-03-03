'use client';

import React, { useState } from 'react';
import InputField from './InputField';
import TextAreaField from './TextAreaField';
import SelectField from './SelectField';
import Button from './Button';
import { COMPLAINT_CATEGORIES, COMPLAINT_PRIORITIES } from '@/lib/constants';
import { submitComplaint } from '@/lib/api-client';

const ComplaintForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'auto',
    priority: 'medium',
    location: '',
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAnalyzeAI = () => {
    if (!formData.description) return;
    
    setIsAnalyzing(true);
    // AI analysis will be handled by the backend analysis task queue.
    // For now, show a brief indicator that analysis has been queued.
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const result = await submitComplaint({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        location: formData.location,
      });

      if (result.success && result.data) {
        setSubmitResult({
          success: true,
          message: result.data.message || `Complaint submitted! Reference: ${result.data.complaintId}`,
        });
        // Reset form
        setFormData({ title: '', description: '', category: 'auto', priority: 'medium', location: '' });
      } else {
        setSubmitResult({
          success: false,
          message: result.error || 'Failed to submit complaint. Please try again.',
        });
      }
    } catch {
      setSubmitResult({
        success: false,
        message: 'Network error. Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const MicIcon = (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="cursor-pointer hover:text-indigo-600 transition-colors"
      role="button"
      aria-label="Voice input"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );

  const SparklesIcon = (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="mr-2"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-white p-6 md:p-10 rounded-3xl shadow-2xl border-b-4 border-amber-200/40 relative overflow-hidden group">
        {/* Subtle accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-amber-200 to-indigo-500 opacity-70"></div>
        
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Register Grievance
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
            Official Form
          </span>
        </div>

        <div className="space-y-6">
          <InputField
            label="Complaint Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Brief summary of your grievance"
            required
          />

          <div className="relative">
            <TextAreaField
              label="Detailed Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide as much detail as possible to help us resolve it faster..."
              required
              icon={MicIcon}
            />
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="secondary"
                className="text-xs font-bold py-2 px-4 shadow-sm"
                onClick={handleAnalyzeAI}
                isLoading={isAnalyzing}
                disabled={!formData.description}
              >
                {SparklesIcon}
                AI Analysis
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SelectField
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              options={COMPLAINT_CATEGORIES}
              required
            />
            <SelectField
              label="Priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              options={COMPLAINT_PRIORITIES}
              required
            />
          </div>

          <InputField
            label="Incident Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="District, Center, or Office Name"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            }
          />
        </div>

        <div className="mt-10 pt-8 border-t border-slate-50">
          {submitResult && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${
              submitResult.success 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`} role="alert">
              {submitResult.message}
            </div>
          )}
          <Button type="submit" className="w-full py-5 text-xl tracking-tight shadow-xl shadow-indigo-100/50" isLoading={isSubmitting} disabled={isSubmitting}>
            Submit Final Complaint
          </Button>
          <div className="mt-6 flex items-center justify-center gap-2 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <p className="text-[11px] font-medium uppercase tracking-wider">
              Securely processed by APPSC Redressal Engine
            </p>
          </div>
        </div>
      </div>
    </form>
  );
};

export default ComplaintForm;
