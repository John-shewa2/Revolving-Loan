import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaCheckDouble, FaTimesCircle, FaFilePdf, FaHistory, FaGavel } from "react-icons/fa";

const HRManagerDashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedLoan, setSelectedLoan] = useState(null); // For Approval Modal

  // Approval Form
  const { register, handleSubmit, reset, setValue } = useForm();

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await api.get("/loans/all");
      setLoans(res.data);
    } catch (error) {
      console.error("Error fetching loans", error);
      toast.error("Failed to load loan queue");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Open Approval Modal
  const openApprovalModal = (loan) => {
    setSelectedLoan(loan);
    setValue("approvedAmount", loan.requestedAmount); // Default to requested
  };

  // Action: Finalize Approval
  const onApprove = async (data) => {
    try {
      await api.post("/loans/finalize", {
        loanId: selectedLoan._id,
        status: "APPROVED",
        approvedAmount: Number(data.approvedAmount)
      });
      toast.success("Loan Approved & Contract Generated!");
      setSelectedLoan(null);
      reset();
      fetchLoans();
    } catch (error) {
      toast.error(error.response?.data?.message || "Approval failed");
    }
  };

  // Action: Reject
  const handleReject = async (loanId) => {
    if (!window.confirm("Are you sure you want to REJECT this loan? This action is final.")) return;

    try {
      await api.post("/loans/finalize", {
        loanId,
        status: "REJECTED"
      });
      toast.success("Loan Rejected.");
      fetchLoans();
    } catch (error) {
      toast.error("Action failed");
    }
  };

  // Download Contract
  const downloadContract = async (loanId) => {
    try {
      const response = await api.get(`/loans/${loanId}/contract`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Contract-${loanId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error("Contract file not found.");
    }
  };

  // Filter Lists
  // Manager only sees 'REVIEWED' loans in their inbox. 'PENDING' are still with Officer.
  const pendingApprovalLoans = loans.filter(l => l.status === 'REVIEWED');
  const historyLoans = loans.filter(l => ['APPROVED', 'REJECTED'].includes(l.status));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Toaster position="top-right" />

      {/* Navbar */}
      <nav className="bg-emerald-800 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
             <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-bold text-emerald-900">
               DBE
             </div>
             <div>
               <h1 className="text-lg font-bold tracking-wide uppercase hidden md:block">HR Management Portal</h1>
               <span className="text-xs text-emerald-200 block md:hidden">Manager Portal</span>
             </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">{user?.email}</p>
              <p className="text-xs text-emerald-300">HR Manager</p>
            </div>
            <button onClick={handleLogout} className="p-2 bg-emerald-700 rounded-full hover:bg-amber-500 transition duration-300">
              <FaSignOutAlt className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto w-full p-6">
        
        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 py-3 px-6 font-medium transition-all duration-200 rounded-t-lg ${
              activeTab === "pending" 
                ? "bg-white border-b-2 border-emerald-600 text-emerald-800 shadow-sm" 
                : "text-gray-500 hover:text-emerald-600 hover:bg-gray-100"
            }`}
          >
            <FaGavel /> Pending Final Approval ({pendingApprovalLoans.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 py-3 px-6 font-medium transition-all duration-200 rounded-t-lg ${
              activeTab === "history" 
                ? "bg-white border-b-2 border-emerald-600 text-emerald-800 shadow-sm" 
                : "text-gray-500 hover:text-emerald-600 hover:bg-gray-100"
            }`}
          >
            <FaHistory /> Loan History
          </button>
        </div>

        {/* Tab: Pending Approval */}
        {activeTab === "pending" && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queue #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request (ETB)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Officer Review</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr><td colSpan="5" className="text-center py-4">Loading...</td></tr>
                  ) : pendingApprovalLoans.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-8 text-gray-500">No loans waiting for final approval.</td></tr>
                  ) : (
                    pendingApprovalLoans.map((loan) => (
                      <tr key={loan._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-900">
                          #{loan.queueNumber}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{loan.employee?.fullName}</div>
                          <div className="text-xs text-gray-500">{loan.employee?.department}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-700">
                          {loan.requestedAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1 text-blue-600 font-medium">
                            <FaCheckDouble /> Reviewed
                          </span>
                          <span className="text-xs">{new Date(loan.reviewedAt).toLocaleDateString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                          <button
                            onClick={() => openApprovalModal(loan)}
                            className="bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(loan._id)}
                            className="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200 transition"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: History */}
        {activeTab === "history" && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queue #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contract</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {historyLoans.map((loan) => (
                    <tr key={loan._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono">#{loan.queueNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{loan.employee?.fullName}</td>
                      <td className="px-6 py-4 text-sm font-bold">
                        {loan.approvedAmount ? `${loan.approvedAmount.toLocaleString()} ETB` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${loan.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {loan.status === 'APPROVED' && (
                          <button
                            onClick={() => downloadContract(loan._id)}
                            className="text-emerald-600 hover:text-emerald-900 flex items-center gap-1"
                          >
                            <FaFilePdf /> Download
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Approval Modal */}
        {selectedLoan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Finalize Approval</h3>
              <p className="text-sm text-gray-600 mb-4">
                Employee: <strong>{selectedLoan.employee?.fullName}</strong><br/>
                Requested: {selectedLoan.requestedAmount.toLocaleString()} ETB<br/>
                Max Eligible: {(selectedLoan.employee?.grossSalary * 6).toLocaleString()} ETB
              </p>
              
              <form onSubmit={handleSubmit(onApprove)}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Approved Amount</label>
                  <input
                    type="number"
                    {...register("approvedAmount", { required: true, min: 1 })}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This amount will be written into the contract.
                  </p>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedLoan(null)}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
                  >
                    Confirm Approval
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default HRManagerDashboard;