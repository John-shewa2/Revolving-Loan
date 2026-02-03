import { useState, useEffect } from "react";
import api from "../api/axios";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  FaSignOutAlt, 
  FaCheckCircle, 
  FaClipboardList, 
  FaUserTie, 
  FaFilePdf 
} from "react-icons/fa";

const HROfficerDashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);

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

  const handleRecommend = async (loanId) => {
    if (!window.confirm("Are you sure you want to recommend this loan for final approval?")) return;
    
    try {
      await api.post("/loans/recommend", { loanId });
      toast.success("Loan Recommended successfully!");
      setSelectedLoan(null);
      fetchLoans();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    }
  };

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
      toast.error("Contract file not found or not yet approved.");
    }
  };

  const pendingLoans = loans.filter(l => l.status === 'PENDING');
  const processedLoans = loans.filter(l => l.status !== 'PENDING');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Toaster position="top-right" />

      <nav className="bg-emerald-800 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
             <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center font-bold text-emerald-900">
               DBE
             </div>
             <div>
               <h1 className="text-lg font-bold tracking-wide uppercase hidden md:block">HR Officer Portal</h1>
               <span className="text-xs text-emerald-200 block md:hidden">HR Portal</span>
             </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">{user?.email}</p>
              <p className="text-xs text-emerald-300">HR Officer</p>
            </div>
            <button onClick={handleLogout} className="p-2 bg-emerald-700 rounded-full hover:bg-amber-500 transition duration-300">
              <FaSignOutAlt className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto w-full p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <FaClipboardList className="text-emerald-600" /> Loan Applications Queue
        </h2>

        {/* Pending Queue */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border-t-4 border-amber-500 mb-8">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-700">Pending Review ({pendingLoans.length})</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Queue #</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Dept</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Amount (ETB)</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-4">Loading queue...</td></tr>
                ) : pendingLoans.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-8 text-gray-500">No pending loans.</td></tr>
                ) : (
                  pendingLoans.map((loan) => (
                    <tr key={loan._id} className="hover:bg-amber-50 transition">
                      <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">#{loan.queueNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{loan.employee?.fullName}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{loan.employee?.department}</td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-700">{loan.requestedAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => setSelectedLoan(loan)}
                          className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-emerald-200 transition"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Processed History */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border-t-4 border-emerald-600">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-700">Processed Applications</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Queue #</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Contract</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processedLoans.map((loan) => (
                  <tr key={loan._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono">#{loan.queueNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{loan.employee?.fullName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${loan.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {loan.status === 'APPROVED' && (
                        <button
                          onClick={() => downloadContract(loan._id)}
                          className="text-emerald-600 hover:text-emerald-900 flex items-center gap-1 font-medium"
                        >
                          <FaFilePdf /> Download Contract
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Review Modal */}
        {selectedLoan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-emerald-800 text-white p-4 flex justify-between items-center sticky top-0">
                <h3 className="font-bold text-lg">Review Loan Request #{selectedLoan.queueNumber}</h3>
                <button onClick={() => setSelectedLoan(null)} className="text-emerald-200 hover:text-white">&times;</button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 border-b pb-2 font-bold text-gray-700 flex items-center gap-2">
                    <FaUserTie /> Employee Information
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Full Name</label>
                    <p className="font-medium">{selectedLoan.employee?.fullName}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Department</label>
                    <p className="font-medium">{selectedLoan.employee?.department}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Gross Salary</label>
                    <p className="font-medium text-emerald-700">{selectedLoan.employee?.grossSalary.toLocaleString()} ETB</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Requested Amount:</span>
                    <span className="text-xl font-bold text-emerald-700">{selectedLoan.requestedAmount.toLocaleString()} ETB</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setSelectedLoan(null)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRecommend(selectedLoan._id)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition flex items-center gap-2 shadow-md font-bold"
                  >
                    <FaCheckCircle /> Recommend for Approval
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default HROfficerDashboard;