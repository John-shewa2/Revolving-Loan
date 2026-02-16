import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { FaBell, FaFilePdf, FaMoneyBillWave, FaHistory, FaSignOutAlt, FaUserLock, FaUserEdit } from "react-icons/fa";

const EmployeeDashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("requestLoan");
  
  const [loans, setLoans] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Initialize form
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Profile Data separately to handle 404 gracefully
      let profileData = null;
      try {
        const profileRes = await api.get("/loans/profile");
        profileData = profileRes.data;
      } catch (err) {
        if (err.response?.status !== 404) console.error("Profile fetch error", err);
      }

      // 2. Pre-fill form if profile exists
      if (profileData) {
        setProfileLoaded(true);
        reset({
          fullName: profileData.fullName || "",
          grossSalary: profileData.grossSalary || "",
          employmentYear: profileData.employmentYear || "",
          retirementYear: profileData.retirementYear || "",
          
          // Use OR empty string to ensure inputs are controlled
          yearOfBirth: profileData.yearOfBirth || "",
          department: profileData.department || "",
          jobLevel: profileData.jobLevel || "",
          
          // Handle nested objects safely
          address: {
            subCity: profileData.address?.subCity || "",
            woreda: profileData.address?.woreda || "",
            houseNumber: profileData.address?.houseNumber || "",
            phoneNumber: profileData.address?.phoneNumber || ""
          },
          guarantor: {
            fullName: profileData.guarantor?.fullName || "",
            address: {
              subCity: profileData.guarantor?.address?.subCity || "",
              woreda: profileData.guarantor?.address?.woreda || "",
              houseNumber: profileData.guarantor?.address?.houseNumber || "",
              phoneNumber: profileData.guarantor?.address?.phoneNumber || ""
            }
          }
        });
      }

      // 3. Fetch Loans & Notifications
      const [loansRes, notifRes] = await Promise.all([
        api.get("/loans/my-loans"),
        api.get("/loans/notifications")
      ]);
      setLoans(loansRes.data);
      setNotifications(notifRes.data);

    } catch (error) {
      console.error("Error fetching dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  const onProfileSubmit = async (data) => {
    setIsProfileSubmitting(true);
    try {
      const salary = Number(data.grossSalary);
      if (!salary) { toast.error("Gross Salary missing in profile."); return; }

      const calculatedAmount = salary * 6;
      
      await api.post("/loans/submit", { amount: calculatedAmount, profileUpdate: data });
      toast.success(`Loan request for ${calculatedAmount.toLocaleString()} ETB submitted!`);
      
      const loansRes = await api.get("/loans/my-loans");
      setLoans(loansRes.data);
      setActiveTab("myHistory");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit.");
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const markRead = async (id) => {
    try {
      await api.put(`/loans/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (e) { console.error(e); }
  };

  const downloadContract = async (id) => {
    try {
      const res = await api.get(`/loans/${id}/contract`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', `Contract-${id}.pdf`);
      document.body.appendChild(link); link.click(); link.remove();
    } catch (e) { toast.error("Contract not found"); }
  };

  const pendingLoans = loans.filter(l => ['PENDING', 'REVIEWED'].includes(l.status)).length;
  const approvedLoans = loans.filter(l => l.status === 'APPROVED').length;

  // CSS Styles
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";
  const readOnlyClass = "w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 font-semibold cursor-not-allowed select-none"; 
  const errorClass = "text-red-500 text-xs mt-1";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Toaster position="top-right" />
      <nav className="bg-emerald-800 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
             <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-bold text-emerald-900">DBE</div>
             <h1 className="text-lg font-bold tracking-wide uppercase">Revolving Loan Portal</h1>
          </div>
          <button onClick={handleLogout} className="p-2 bg-emerald-700 rounded-full hover:bg-amber-500 transition"><FaSignOutAlt /></button>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-amber-500">
            <h3 className="text-gray-500 text-sm font-semibold uppercase mb-4">Loan Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span>Active</span><span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{pendingLoans}</span></div>
              <div className="flex justify-between"><span>Approved</span><span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">{approvedLoans}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 max-h-96 overflow-y-auto">
            <h3 className="text-gray-700 font-bold flex items-center gap-2 mb-4"><FaBell className="text-amber-500"/> Notifications</h3>
            <div className="space-y-2">
              {notifications.map(n => (
                <div key={n._id} onClick={() => markRead(n._id)} className={`p-3 rounded text-sm cursor-pointer ${n.read ? 'bg-gray-50' : 'bg-emerald-50 border-l-4 border-emerald-500'}`}>
                  <p>{n.message}</p>
                </div>
              ))}
              {notifications.length === 0 && <p className="text-xs text-gray-400">No notifications.</p>}
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3">
          <div className="flex space-x-2 mb-6 border-b border-gray-200">
            <button onClick={() => setActiveTab("requestLoan")} className={`py-3 px-6 font-medium rounded-t-lg flex items-center gap-2 ${activeTab==="requestLoan" ? "bg-white border-b-2 border-emerald-600 text-emerald-800" : "text-gray-500 hover:bg-gray-100"}`}><FaMoneyBillWave/> Request Loan</button>
            <button onClick={() => setActiveTab("myHistory")} className={`py-3 px-6 font-medium rounded-t-lg flex items-center gap-2 ${activeTab==="myHistory" ? "bg-white border-b-2 border-emerald-600 text-emerald-800" : "text-gray-500 hover:bg-gray-100"}`}><FaHistory/> My Applications</button>
          </div>

          {activeTab === "requestLoan" && (
            <div className="space-y-6">
              {!profileLoaded && <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">Loading Profile Data...</div>}
              
              <form onSubmit={handleSubmit(onProfileSubmit)}>
                
                {/* DIVISION 1: SEEDED INFORMATION (READ ONLY) */}
                <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-gray-400 mb-6">
                  <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <FaUserLock className="text-gray-500" /> በኮንሲዩመር ሎን ማነጅመንት ዲቪዥን የተሞላ
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>ሙሉ ሰም</label>
                      <input {...register("fullName")} className={readOnlyClass} readOnly tabIndex="-1" />
                    </div>
                    <div>
                      <label className={labelClass}>ያለተጣራ የወር ደምወዝ መጠን</label>
                      <input type="number" {...register("grossSalary")} className={readOnlyClass} readOnly tabIndex="-1" />
                    </div>
                    <div>
                      <label className={labelClass}>በባንኩ የተቀጠሩበተ ዘመን</label>
                      <input type="number" {...register("employmentYear")} className={readOnlyClass} readOnly tabIndex="-1" />
                    </div>
                    <div>
                      <label className={labelClass}>የጡረታ ዘመን</label>
                      <input type="number" {...register("retirementYear")} className={readOnlyClass} readOnly tabIndex="-1" />
                    </div>
                  </div>
                </div>

                {/* DIVISION 2: EMPLOYEE EDITABLE INFORMATION */}
                <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-emerald-600">
                  <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2">
                    <FaUserEdit className="text-emerald-600" /> የግል መረጃዎን ያሟሉ 
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2"><h4 className="font-semibold text-gray-600 border-b pb-1">የስራ እና የግል መረጃ</h4></div>
                    
                    <div>
                      <label className={labelClass}>የልደት ዘመን</label>
                      <input type="number" {...register("yearOfBirth", { required: "Required" })} className={inputClass} placeholder="YYYY" />
                      {errors.yearOfBirth && <span className={errorClass}>Required</span>}
                    </div>
                    <div>
                      <label className={labelClass}>የሚሰሩበት ክፍል</label>
                      <input {...register("department", { required: "Required" })} className={inputClass} placeholder="e.g. IT" />
                      {errors.department && <span className={errorClass}>Required</span>}
                    </div>
                    <div>
                      <label className={labelClass}>የሥራ ደረጃ</label>
                      <input {...register("jobLevel", { required: "Required" })} className={inputClass} placeholder="e.g. Senior" />
                      {errors.jobLevel && <span className={errorClass}>Required</span>}
                    </div>

                    <div className="md:col-span-2"><h4 className="font-semibold text-gray-600 border-b pb-1 mt-2">አድራሻ</h4></div>
                    <div><label className={labelClass}>ክ/ከተማ</label><input {...register("address.subCity")} className={inputClass} /></div>
                    <div><label className={labelClass}>ወረዳ</label><input {...register("address.woreda")} className={inputClass} /></div>
                    <div><label className={labelClass}>የቤት ቁጥር</label><input {...register("address.houseNumber")} className={inputClass} /></div>
                    <div><label className={labelClass}>ስልክ ቁጥር</label><input {...register("address.phoneNumber")} className={inputClass} /></div>

                    <div className="md:col-span-2"><h4 className="font-semibold text-gray-600 border-b pb-1 mt-2">የዋስ መረጃ</h4></div>
                    <div className="md:col-span-2"><label className={labelClass}>የዋስ ስም</label><input {...register("guarantor.fullName")} className={inputClass} /></div>
                    <div><label className={labelClass}>ክ/ከተማ</label><input {...register("guarantor.address.subCity")} className={inputClass} /></div>
                    <div><label className={labelClass}>ወረዳ</label><input {...register("guarantor.address.woreda")} className={inputClass} /></div>
                    <div><label className={labelClass}>ስልክ ቁጥር</label><input {...register("guarantor.address.phoneNumber")} className={inputClass} /></div>
                  </div>

                  <div className="mt-8">
                    <button type="submit" disabled={isProfileSubmitting || !profileLoaded} className="w-full bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-800 transition shadow-md disabled:bg-gray-400">
                      {isProfileSubmitting ? "Processing..." : "Submit Loan Request"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {activeTab === "myHistory" && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
               <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queue #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loans.map(loan => (
                      <tr key={loan._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono font-bold">#{loan.queueNumber}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(loan.submittedAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-medium">{loan.requestedAmount.toLocaleString()} ETB</td>
                        <td className="px-6 py-4"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${loan.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{loan.status}</span></td>
                        <td className="px-6 py-4 text-sm">
                          {loan.status === 'APPROVED' && <button onClick={() => downloadContract(loan._id)} className="text-emerald-600 flex items-center gap-1"><FaFilePdf /> Contract</button>}
                        </td>
                      </tr>
                    ))}
                    {loans.length === 0 && <tr><td colSpan="5" className="text-center py-6 text-gray-500">No applications found.</td></tr>}
                  </tbody>
               </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;