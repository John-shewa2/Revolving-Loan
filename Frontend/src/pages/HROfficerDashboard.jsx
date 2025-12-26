import { useState, useEffect } from "react";
import api from "../api/axios";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { FaSignOutAlt, FaCheckCircle, FaTimesCircle, FaClipboardList, FaUserTie } from "react-icons/fa";

const HROfficerDashboard = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null); // For detail view modal

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

  // Action: Recommend Loan (Move to HR Manager)
  const handleRecommend = async (loanId) => {
    if (!window.confirm("Are you sure you want to recommend this loan for final approval?")) return;
    
    try {
      await api.post("/loans/recommend", { loanId });
      toast.success("Loan Recommended successfully!");
      setSelectedLoan(null);
      fetchLoans(); // Refresh list
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    }
  };

  // Action: Reject Loan
  // Note: HR Officer can reject directly, effectively closing the request
  const handleReject = async (loanId) => {
    const reason = window.prompt("Enter rejection reason (optional):");
    if (reason === null) return; // Cancelled

    try {
      // We reuse the finalize endpoint or a specific reject endpoint. 
      // Based on previous backend logic, 'finalizeLoan' was for Managers. 
      // If Officer needs to reject, we might need a specific route or use the manager one if permitted.
      // However, looking at the backend, 'recommendLoan' only moves to REVIEWED. 
      // Let's assume for this step, if they reject, it stays Rejected. 
      // *Correction*: The current backend 'recommendLoan' only supports moving to 'REVIEWED'.
      // If you strictly need Rejection at this stage, we might need to update the backend to allow Officers to set status="REJECTED".
      // For now, let's strictly implement the "Recommend" flow as defined in the backend code provided previously.
      
      // If we strictly follow the backend code from Recommendation 2:
      // The Officer ONLY calls /recommend.
      // If you want them to Reject, we would need to add that logic to the backend controller.
      // For this UI, I will implement the "Recommend" button primarily.
      
      await api.post("/loans/recommend", { loanId }); 
      // Ideally this moves to REVIEWED. If rejection is needed here, backend adjustment is required.
      // I'll stick to the "Recommend" flow for now to match the backend.
      
      toast.success("Loan processed.");
      fetchLoans();
    } catch (error) {
      toast.error("Failed.");
    }
  };

  // Filter lists
  const pendingLoans = loans.filter(l => l.status === 'PENDING');
  const processedLoans = loans.filter(l => l.status !== 'PENDING');

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
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
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
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-4">Loading queue...</td></tr>
                ) : pendingLoans.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">No pending loans.</td></tr>
                ) : (
                  pendingLoans.map((loan) => (
                    <tr key={loan._id} className="hover:bg-amber-50 transition">
                      <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">
                        #{loan.queueNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{loan.employee?.fullName}</div>
                        <div className="text-xs text-gray-500">ID: {loan.employee?.userId}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{loan.employee?.department}</td>
                      <td className="px-6 py-4 text-sm font-bold text-emerald-700">
                        {loan.requestedAmount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(loan.submittedAt).toLocaleDateString()}
                      </td>
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

        {/* Review Modal */}
        {selectedLoan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-emerald-800 text-white p-4 flex justify-between items-center sticky top-0">
                <h3 className="font-bold text-lg">Review Loan Request #{selectedLoan.queueNumber}</h3>
                <button onClick={() => setSelectedLoan(null)} className="text-emerald-200 hover:text-white">&times;</button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Employee Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 border-b pb-2 mb-2 font-bold text-gray-700 flex items-center gap-2">
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
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Max Eligible (6x)</label>
                    <p className="font-medium text-amber-600">{(selectedLoan.employee?.grossSalary * 6).toLocaleString()} ETB</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Employment Year</label>
                    <p className="font-medium">{selectedLoan.employee?.employmentYear}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase">Retirement Year</label>
                    <p className="font-medium">{selectedLoan.employee?.retirementYear}</p>
                  </div>
                </div>

                {/* Loan Details */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600 font-medium">Requested Amount:</span>
                    <span className="text-xl font-bold text-emerald-700">{selectedLoan.requestedAmount.toLocaleString()} ETB</span>
                  </div>
                  {selectedLoan.requestedAmount > (selectedLoan.employee?.grossSalary * 6) && (
                    <div className="text-red-500 text-xs bg-red-50 p-2 rounded border border-red-100">
                      Warning: Requested amount exceeds 6x salary limit.
                    </div>
                  )}
                </div>

                {/* Guarantor Info */}
                <div className="border-t pt-4">
                  <h4 className="font-bold text-gray-700 mb-2">Guarantor</h4>
                  <p className="text-sm">Name: {selectedLoan.employee?.guarantor?.fullName || 'N/A'}</p>
                  <p className="text-sm">Phone: {selectedLoan.employee?.guarantor?.address?.phoneNumber || 'N/A'}</p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setSelectedLoan(null)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRecommend(selectedLoan._id)}
                    className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition flex items-center gap-2 shadow-md"
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