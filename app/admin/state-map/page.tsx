'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import Topbar from '@/components/admin/dashboard/Topbar';
import { Loader2, MapPin, Building2, ChevronRight, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DEPARTMENTS } from '@/lib/constants';

const MapComponent = dynamic(() => import('@/components/admin/dashboard/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-50 flex items-center justify-center border border-slate-200 rounded-2xl">
      <Loader2 size={40} className="animate-spin text-amber-700 aspect-square" />
    </div>
  )
});

export default function StateMapDashboard() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // App state
  const [globalDeptFilter, setGlobalDeptFilter] = useState<string>('');
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [detailedComplaints, setDetailedComplaints] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchIncidents = async () => {
    try {
      const url = globalDeptFilter ? `/api/admin/incidents?department=${globalDeptFilter}` : `/api/admin/incidents`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 30000);
    return () => clearInterval(interval);
  }, [globalDeptFilter]);

  useEffect(() => {
    if (selectedLoc && selectedDept && selectedCategory) {
      fetchDetailedComplaints(selectedLoc, selectedDept, selectedCategory);
    } else {
      setDetailedComplaints([]);
    }
  }, [selectedLoc, selectedDept, selectedCategory]);

  const fetchDetailedComplaints = async (loc: string, department: string, category: string) => {
    setLoadingDetails(true);
    try {
      const pId = encodeURIComponent(department);
      const pCat = encodeURIComponent(category);
      const pLoc = encodeURIComponent(loc);
      const res = await fetch(`/api/admin/incidents/details?department=${pId}&category=${pCat}&location=${pLoc}`);
      if (res.ok) {
        const data = await res.json();
        setDetailedComplaints(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'critical') return 'text-rose-700 bg-rose-100 border-rose-200';
    if (priority === 'high') return 'text-orange-700 bg-orange-100 border-orange-200';
    if (priority === 'medium') return 'text-amber-700 bg-amber-100 border-amber-200';
    return 'text-emerald-700 bg-emerald-100 border-emerald-200';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'resolved' || status === 'closed') {
      return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Resolved</span>;
    }
    return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{status.replace('_', ' ')}</span>;
  };

  // Incidents for selected location
  const locIncidents = incidents.filter(inc => {
    const l = inc.district || inc.location || inc._id.loc || 'Unknown Area';
    return l.toLowerCase().trim() === selectedLoc;
  });

  // Group locIncidents by Department -> then categories are within locIncidents
  const deptsInLoc = locIncidents.reduce((acc, inc) => {
    const dept = inc.department;
    if (!acc[dept]) acc[dept] = { department: dept, pendingCount: 0, resolvedCount: 0, complaintCount: 0, categories: [] };
    acc[dept].pendingCount += (inc.pendingCount || 0);
    acc[dept].resolvedCount += (inc.resolvedCount || 0);
    acc[dept].complaintCount += (inc.complaintCount || 0);
    acc[dept].categories.push(inc);
    return acc;
  }, {} as Record<string, any>);

  const handleLocationSelect = (loc: string) => {
    const normalizedLoc = loc.toLowerCase().trim();
    if (selectedLoc === normalizedLoc) {
      setSelectedLoc(null);
      setSelectedDept(null);
      setSelectedCategory(null);
    } else {
      setSelectedLoc(normalizedLoc);
      setSelectedDept(null);
      setSelectedCategory(null);
    }
  };

  const handleDeptSelect = (dept: string) => {
    setSelectedDept(dept);
    setSelectedCategory(null);
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
  };

  return (
    <div className="min-h-screen bg-[#faf7f0] flex font-sans">
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar />

        <main className="p-6 md:p-8 space-y-6 flex-1 flex flex-col h-[calc(100vh-73px)]">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2 border-b border-slate-200 pb-5 pt-0 shrink-0">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
                Arunachal Pradesh Interactive Map
              </h1>
              <p className="text-slate-500 max-w-2xl mt-1">
                Geographical mapping of grievances to districts across the state. Click on any region to view department-specific issues.
              </p>
            </div>
            
            {/* Global Filter */}
            <div className="w-full md:w-72">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Filter by Department</label>
              <select 
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-amber-500 focus:border-amber-500 p-2.5 shadow-sm font-medium"
                value={globalDeptFilter}
                onChange={(e) => {
                  setGlobalDeptFilter(e.target.value);
                  setSelectedLoc(null);
                  setSelectedDept(null);
                  setSelectedCategory(null);
                }}
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
            {/* Left: Map */}
            <div className="flex-1 min-h-0 relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              {loading && incidents.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={40} className="animate-spin text-amber-700 aspect-square" />
                    <span className="text-slate-500 font-medium animate-pulse">Loading Live Map...</span>
                  </div>
                </div>
              ) : (
                <MapComponent incidents={incidents} selectedLocation={selectedLoc} onLocationSelect={handleLocationSelect} />
              )}
            </div>

            {/* Right: Contextual Sidebar */}
            {selectedLoc && (
              <div className="w-full md:w-[450px] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden shrink-0 animate-in slide-in-from-right-8 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 shrink-0 text-white shadow-md flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black capitalize tracking-tight flex items-center gap-2">
                       <MapPin size={20} className="text-amber-400"/> {selectedLoc}
                    </h2>
                    
                    {/* Breadcrumbs */}
                    <div className="text-[11px] text-slate-300 font-medium mt-2 flex flex-wrap items-center gap-1.5 opacity-90 uppercase tracking-wider">
                      <span className="cursor-pointer hover:text-white" onClick={() => { setSelectedDept(null); setSelectedCategory(null); }}>Departments</span>
                      
                      {selectedDept && (
                        <>
                          <ChevronRight size={10} />
                          <span className={`cursor-pointer hover:text-white ${!selectedCategory ? 'text-amber-400' : ''}`} onClick={() => setSelectedCategory(null)}>
                             {selectedDept.replace(/_/g, ' ')}
                          </span>
                        </>
                      )}
                      
                      {selectedCategory && (
                        <>
                          <ChevronRight size={10} />
                          <span className="text-amber-400 truncate max-w-[150px]" title={selectedCategory}>
                             {selectedCategory === 'pending_ai' ? 'Pending Analysis' : selectedCategory.replace(/_/g, ' ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedLoc(null)} className="p-1.5 bg-white/10 hover:bg-rose-500 hover:text-white rounded-lg transition-colors" title="Close Panel">
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                  {/* LEVEL 1: Select Department */}
                  {!selectedDept && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2">Active Departments</h4>
                      {Object.keys(deptsInLoc).length === 0 ? (
                        <div className="py-10 text-center text-slate-500 text-sm border border-dashed rounded-xl">
                          No active incidents recorded for this region.
                        </div>
                      ) : (
                        Object.values(deptsInLoc).sort((a: any, b: any) => b.complaintCount - a.complaintCount).map((dept: any, i: number) => {
                          const isCatPending = dept.pendingCount > 0;
                          const isCatResolved = dept.resolvedCount > 0;
                          return (
                            <div
                              key={i}
                              onClick={() => handleDeptSelect(dept.department)}
                              className="bg-white border-2 border-slate-100 hover:border-indigo-300 rounded-xl p-3 cursor-pointer group hover:shadow-sm transition-all"
                            >
                               <div className="flex items-center gap-3">
                                  <div className="bg-indigo-50 p-2 rounded-lg shrink-0">
                                     <Building2 size={20} className="text-indigo-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <h5 className="font-bold text-slate-800 text-sm capitalize truncate pr-2 group-hover:text-indigo-700 transition-colors">
                                        {dept.department.replace(/_/g, ' ')}
                                     </h5>
                                     <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 rounded">{dept.complaintCount} reports</span>
                                        {isCatPending && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 rounded flex items-center gap-0.5"><Clock size={8}/> {dept.pendingCount} P</span>}
                                        {isCatResolved && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 rounded flex items-center gap-0.5"><CheckCircle size={8}/> {dept.resolvedCount} R</span>}
                                     </div>
                                  </div>
                                  <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                               </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* LEVEL 2: Categories Breakdown for Selected Department */}
                  {selectedDept && !selectedCategory && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex items-center justify-between mb-2 border-b border-slate-200 pb-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Problem Types</h4>
                        <button onClick={() => setSelectedDept(null)} className="text-[10px] font-bold text-indigo-600 hover:underline">
                          &larr; Back to Departments
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {deptsInLoc[selectedDept]?.categories.sort((a:any, b:any) => b.complaintCount - a.complaintCount).map((inc: any, i: number) => {
                          const isCatPending = inc.pendingCount > 0;
                          const isCatResolved = inc.resolvedCount > 0;

                          return (
                            <div
                              key={i}
                              onClick={() => handleCategorySelect(inc.category)}
                              className="bg-white border-2 border-slate-100 hover:border-amber-300 rounded-xl p-3 cursor-pointer group hover:shadow-sm transition-all relative overflow-hidden"
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <div className="flex justify-between items-start">
                                <span className="text-sm font-bold text-slate-800 capitalize tracking-tight pr-2">
                                    {inc.category === 'pending_ai' ? 'Pending Analysis' : inc.category.replace(/_/g, ' ')}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 uppercase rounded-sm border shrink-0 ${getPriorityColor(inc.priority)}`}>
                                    {inc.priority}
                                </span>
                              </div>

                              <div className="mt-2 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity">
                                 <span className="text-xs font-black text-slate-600">{inc.complaintCount} <span className="font-medium text-slate-400 text-[10px] ml-0.5">reports</span></span>
                                 <div className="flex items-center gap-1.5 align-middle">
                                    {isCatPending && <span className="text-[9px] font-bold flex items-center gap-0.5 text-amber-700 bg-amber-100 px-1 rounded"><Clock size={8}/> {inc.pendingCount}</span>}
                                    {isCatResolved && <span className="text-[9px] font-bold flex items-center gap-0.5 text-emerald-700 bg-emerald-100 px-1 rounded"><CheckCircle size={8}/> {inc.resolvedCount}</span>}
                                 </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* LEVEL 3: Detailed Complaint List */}
                  {selectedDept && selectedCategory && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                       <div className="flex items-center justify-between mb-2 border-b border-slate-200 pb-2">
                         <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grievances</h4>
                         <button onClick={() => setSelectedCategory(null)} className="text-[10px] font-bold text-indigo-600 hover:underline">
                           &larr; Back to Problem Types
                         </button>
                       </div>
                       
                       {loadingDetails ? (
                         <div className="flex items-center justify-center py-10 text-slate-400 space-x-2">
                           <Loader2 size={18} className="animate-spin shrink-0" /> <span className="text-xs">Loading grievances...</span>
                         </div>
                       ) : detailedComplaints.length === 0 ? (
                         <div className="text-center py-10 text-slate-500 bg-white rounded-xl border border-dashed text-xs">
                           No details found.
                         </div>
                       ) : (
                         <div className="flex flex-col gap-2.5">
                            {detailedComplaints.map((complaint) => (
                               <div
                                 key={complaint.complaintId}
                                 onClick={() => router.push(`/admin/complaints/${complaint.complaintId}`)}
                                 className="bg-white border-2 hover:border-indigo-300 border-slate-100 p-3 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer group"
                               >
                                 <div className="flex items-center gap-2 mb-1.5 justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{complaint.trackingId || complaint.complaintId?.slice(-6) || complaint._id.toString().slice(-6)}</span>
                                      {getStatusBadge(complaint.status)}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs">
                                       <AlertCircle size={12} className="text-amber-500" />
                                       <span className="capitalize text-slate-400 font-medium text-[10px]">{complaint.priority}</span>
                                    </div>
                                 </div>
                                 
                                 <h5 className="font-bold text-slate-800 text-xs line-clamp-2 leading-snug group-hover:text-indigo-700 transition-colors mb-1.5"> 
                                    {complaint.title}
                                 </h5>
                                 
                                 <div className="flex items-center mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 justify-between">
                                    <span>{new Date(complaint.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    <span className="text-slate-300 group-hover:text-indigo-400 transition-colors flex items-center gap-1">Open Details <ChevronRight size={10} /></span>
                                 </div>
                               </div>
                            ))}
                         </div>
                       )}
                    </div>
                  )}

                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
