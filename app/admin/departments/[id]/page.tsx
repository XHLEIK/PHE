'use client';

import React, { useEffect, useState, use } from 'react';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import Topbar from '@/components/admin/dashboard/Topbar';
import { Loader2, Zap, MapPin, AlertCircle, ChevronRight, CheckCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DepartmentHeatboard({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection states
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Detailed complaints state
  const [detailedComplaints, setDetailedComplaints] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`/api/admin/incidents?department=${id}`);
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
  }, [id]);

  useEffect(() => {
    if (selectedLoc && selectedCategory) {
      fetchDetailedComplaints(selectedLoc, selectedCategory);
    } else {
      setDetailedComplaints([]);
    }
  }, [selectedLoc, selectedCategory]);

  const fetchDetailedComplaints = async (loc: string, category: string) => {
    setLoadingDetails(true);
    try {
      const pId = encodeURIComponent(id);
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

  // Group by location
  const groupedByLocation = incidents.reduce((acc, inc) => {
    const loc = inc.district || inc.location || inc._id.loc || 'Unknown Area';
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(inc);
    return acc;
  }, {} as Record<string, any[]>);

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

  const handleLocationClick = (loc: string) => {
    if (selectedLoc === loc) {
      setSelectedLoc(null);
      setSelectedCategory(null);
    } else {
      setSelectedLoc(loc);
      setSelectedCategory(null);
    }
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  return (
    <div className="min-h-screen bg-[#faf7f0] flex font-sans">
      <Sidebar />
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar />

        <main className="p-6 md:p-8 space-y-6 flex-1 flex flex-col">
          <div className="flex items-end justify-between mb-2 pb-5 border-b border-slate-200">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">{id.replace('_', ' ')} Heatboard</h1>
              <p className="text-slate-500 mt-1 max-w-2xl">
                Area-wise active grievance analytics. Select a location to view issue breakdowns and corresponding live reports.
              </p>
            </div>
          </div>

          {loading && incidents.length === 0 ? (
            <div className="flex items-center justify-center py-20 flex-1">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={40} className="animate-spin text-amber-700 aspect-square" />
                <span className="text-slate-500 font-medium animate-pulse">Loading Live Heatboard...</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[500px]">
              
              {/* LEFT COLUMN: Vertical Locations List */}
              <div className="w-full lg:w-1/3 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-shrink-0 max-h-[75vh]">
                <div className="bg-slate-50 p-4 border-b border-slate-200 sticky top-0 z-10">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <MapPin size={18} className="text-amber-600" /> Affected Regions
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Select a location to inspect reported problems</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {Object.keys(groupedByLocation).length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-sm border border-dashed rounded-xl m-2">
                      No active incidents recorded for this department.
                    </div>
                  ) : (
                    Object.entries(groupedByLocation).map(([loc, areaIncidentsArray]) => {
                      const areaIncidents = areaIncidentsArray as any[];
                      const totalReportsInLoc = areaIncidents.reduce((a: number, b: any) => a + (b.complaintCount || 0), 0);
                      const isSelected = selectedLoc === loc;
                      
                      return (
                        <button
                          key={loc}
                          onClick={() => handleLocationClick(loc)}
                          className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center justify-between group ${isSelected ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-amber-300 hover:shadow-sm hover:bg-amber-50'}`}
                        >
                          <div>
                            <h4 className={`text-base font-bold capitalize tracking-tight ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>{loc.toLowerCase()}</h4>
                            <p className={`text-xs mt-0.5 font-medium ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                              {totalReportsInLoc} Total Report{totalReportsInLoc !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <ChevronRight size={18} className={`transition-transform duration-300 ${isSelected ? 'text-indigo-500 rotate-90' : 'text-slate-300 group-hover:text-amber-500 group-hover:translate-x-1'}`} />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Issue Breakdowns / Detailed Reports */}
              <div className="w-full lg:w-2/3 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden max-h-[75vh]">
                
                {!selectedLoc ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                    <div className="bg-slate-50 p-6 rounded-full mb-4">
                      <MapPin size={48} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700">Select a Location</h3>
                    <p className="text-slate-500 max-w-sm mt-2 text-sm">
                      Choose any affected region from the left panel to inspect the categorized grievance breakdown and detail lists.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Header indicating current selection */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5 sticky top-0 z-10 text-white shadow-md flex justify-between items-center">
                      <div>
                        <h2 className="text-xl font-black capitalize tracking-tight flex items-center gap-2">
                          <MapPin size={20} className="text-amber-400"/> {selectedLoc.toLowerCase()}
                        </h2>
                        {selectedCategory && (
                          <div className="text-xs text-slate-300 font-medium mt-1 flex items-center gap-1.5 opacity-80 uppercase tracking-wider">
                            <span className="cursor-pointer hover:text-white" onClick={() => setSelectedCategory(null)}>Categories</span>
                            <ChevronRight size={12} />
                            <span className="text-amber-400">{selectedCategory === 'pending_ai' ? 'Pending Analysis' : selectedCategory.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                      </div>
                      
                      {selectedCategory && (
                        <button onClick={() => setSelectedCategory(null)} className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-white/20 transition-all">
                          Back to Categories
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
                      
                      {/* View 1: Categories Breakdown */}
                      {!selectedCategory && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2">Problem Types in this region</h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groupedByLocation[selectedLoc].map((inc: any, i: number) => {
                              const isCatPending = inc.pendingCount > 0;
                              const isCatResolved = inc.resolvedCount > 0;
                              
                              return (
                                <div 
                                  key={i} 
                                  onClick={() => handleCategoryClick(inc.category)}
                                  className="bg-white border-2 border-slate-100 hover:border-amber-300 rounded-xl p-4 cursor-pointer group hover:shadow-md transition-all relative overflow-hidden"
                                >
                                  {/* Color bar indicator */}
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                  
                                  <div className="flex justify-between items-start">
                                    <span className="text-base font-bold text-slate-800 capitalize tracking-tight">
                                        {inc.category === 'pending_ai' ? 'Pending Analysis' : inc.category.replace(/_/g, ' ')}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 uppercase rounded-full border flex items-center gap-1 ${getPriorityColor(inc.priority)}`}>
                                      {inc.priority}
                                    </span>
                                  </div>
                                  
                                  <div className="mt-3 bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex items-center justify-between">
                                     <span className="text-sm font-black text-slate-700">{inc.complaintCount} <span className="font-medium text-slate-500 text-xs ml-0.5">reports of this type</span></span>
                                     <div className="flex items-center gap-1.5 align-middle">
                                        {isCatPending && <span className="text-[10px] font-bold flex items-center gap-0.5 text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded" title="Pending"><Clock size={10}/> {inc.pendingCount}</span>}
                                        {isCatResolved && <span className="text-[10px] font-bold flex items-center gap-0.5 text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded" title="Resolved"><CheckCircle size={10}/> {inc.resolvedCount}</span>}
                                     </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* View 2: Detailed Complaint List for a selected category */}
                      {selectedCategory && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                           {loadingDetails ? (
                             <div className="flex items-center justify-center py-20 text-slate-400 space-x-2">
                               <Loader2 size={24} className="animate-spin" /> <span>Loading grievances...</span>
                             </div>
                           ) : detailedComplaints.length === 0 ? (
                             <div className="text-center py-20 text-slate-500 bg-white rounded-xl border border-dashed">
                               No details found for this problem type.
                             </div>
                           ) : (
                             <div className="flex flex-col gap-3">
                                {detailedComplaints.map((complaint) => (
                                   <div
                                     key={complaint.complaintId}
                                     onClick={() => router.push(`/admin/complaints/${complaint.complaintId}`)}
                                     className="bg-white border hover:border-indigo-300 border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row gap-4 justify-between items-start md:items-center group"
                                   >
                                     <div className="flex-1 min-w-0">
                                       <div className="flex items-center gap-2 mb-1.5">
                                          <span className="text-xs font-bold font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">#{complaint.trackingId || complaint._id.toString().slice(-6).toUpperCase()}</span>
                                          {getStatusBadge(complaint.status)}
                                       </div>
                                       <h5 className="font-bold text-slate-800 text-sm md:text-base truncate group-hover:text-indigo-700 transition-colors">
                                          {complaint.title}
                                       </h5>
                                       <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                          {complaint.description}
                                       </p>
                                     </div>
                                     
                                     <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4 w-full md:w-auto justify-between md:justify-end">
                                        <div className="flex items-center gap-1.5">
                                           <AlertCircle size={14} className="text-amber-500" />
                                           <span className="capitalize">{complaint.priority} Priority</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                           <Clock size={14} />
                                           <span>{new Date(complaint.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                     </div>
                                   </div>
                                ))}
                             </div>
                           )}
                        </div>
                      )}

                    </div>
                  </>
                )}
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
