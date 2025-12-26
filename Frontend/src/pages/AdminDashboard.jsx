import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("createUser");

  // State for Password Management
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);

  // Forms
  const { register: registerUser, handleSubmit: handleSubmitUser, reset: resetUser } = useForm();
  const { register: registerSeed, handleSubmit: handleSubmitSeed, reset: resetSeed } = useForm();
  const { register: registerReset, handleSubmit: handleSubmitReset, reset: clearResetForm } = useForm();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const onCreateUser = async (data) => {
    try {
      await api.post("/admin/create-user", data);
      toast.success(`User (${data.role}) created successfully!`);
      resetUser();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create user");
    }
  };

  const onSeedEmployees = async (data) => {
    try {
      const employees = JSON.parse(data.jsonData);
      if (!Array.isArray(employees)) {
        toast.error("Input must be a JSON array of employees");
        return;
      }
      const res = await api.post("/admin/seed-employees", { employees });
      toast.success(`Seeding Complete: ${res.data.results.success} succeeded, ${res.data.results.failed} failed.`);
      resetSeed();
    } catch (error) {
      toast.error("Invalid JSON or Server Error");
    }
  };

  useEffect(() => {
    if (activeTab === "passwordManagement") {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const onResetPassword = async (data) => {
    if (!selectedUser) return;
    try {
      await api.post("/admin/reset-password", {
        userId: selectedUser._id,
        newPassword: data.newPassword
      });
      toast.success(`Password updated for ${selectedUser.email}`);
      setShowResetModal(false);
      setSelectedUser(null);
      clearResetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    }
  };

  const openResetModal = (user) => {
    setSelectedUser(user);
    setShowResetModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-emerald-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded-full">
               <div className="w-8 h-8 rounded-full bg-amber-500"></div>
            </div>
            <h1 className="text-xl font-bold tracking-wide uppercase">Admin Dashboard</h1>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md text-sm font-semibold transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-5xl mx-auto w-full p-6">
        
        {/* Tabs */}
        <div className="flex space-x-4 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab("createUser")}
            className={`py-2 px-4 font-medium transition-colors duration-200 ${
              activeTab === "createUser" 
                ? "border-b-4 border-emerald-600 text-emerald-800" 
                : "text-gray-500 hover:text-emerald-600"
            }`}
          >
            Create System User
          </button>
          <button
            onClick={() => setActiveTab("seedData")}
            className={`py-2 px-4 font-medium transition-colors duration-200 ${
              activeTab === "seedData" 
                ? "border-b-4 border-emerald-600 text-emerald-800" 
                : "text-gray-500 hover:text-emerald-600"
            }`}
          >
            Seed Employee Data
          </button>
          <button
            onClick={() => setActiveTab("passwordManagement")}
            className={`py-2 px-4 font-medium transition-colors duration-200 ${
              activeTab === "passwordManagement" 
                ? "border-b-4 border-emerald-600 text-emerald-800" 
                : "text-gray-500 hover:text-emerald-600"
            }`}
          >
            Password Management
          </button>
        </div>

        {/* Tab 1: Create User */}
        {activeTab === "createUser" && (
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-emerald-600">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Create New User</h2>
            <form onSubmit={handleSubmitUser(onCreateUser)} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input {...registerUser("email", { required: true })} type="email" className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input {...registerUser("password", { required: true })} type="password" className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select {...registerUser("role", { required: true })} className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500">
                  <option value="ADMIN">Admin</option>
                  <option value="HR_OFFICER">HR Officer</option>
                  <option value="HR_MANAGER">HR Manager</option>
                  <option value="EMPLOYEE">Employee (Manual)</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-emerald-700 text-white font-bold py-2 px-4 rounded hover:bg-emerald-800 transition">
                Create User
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Seed Data */}
        {activeTab === "seedData" && (
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-amber-500">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Bulk Seed Employees</h2>
            <p className="text-sm text-gray-500 mb-4">Paste a JSON array of employee objects.</p>
            
            <div className="bg-gray-100 p-4 rounded mb-4 text-xs font-mono text-gray-600">
              <p className="font-bold mb-2">Format:</p>
              <pre>{`[
  {
    "email": "abebe@dbe.com.et",
    "fullName": "Abebe Kebede",
    "grossSalary": 25000,
    "employmentYear": 2015,
    "retirementYear": 2045,
    "password": "MySecretPassword123" 
  }
]`}</pre>
              <ul className="mt-3 list-disc list-inside text-gray-700">
                <li><span className="font-semibold text-emerald-700">password</span> is optional. If omitted, it defaults to <span className="font-bold bg-gray-200 px-1 rounded">Password@123</span>.</li>
                <li>Do not include department, job level, or address here (Employee fills those).</li>
              </ul>
            </div>

            <form onSubmit={handleSubmitSeed(onSeedEmployees)} className="space-y-4">
              <textarea
                {...registerSeed("jsonData", { required: true })}
                rows={10}
                className="w-full border border-gray-300 rounded-md p-2 font-mono text-sm focus:ring-amber-500 focus:border-amber-500"
                placeholder='[ { "email": "...", ... } ]'
              ></textarea>
              <button
                type="submit"
                className="w-full bg-amber-500 text-white font-bold py-2 px-4 rounded hover:bg-amber-600 transition"
              >
                Seed Data
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Password Management */}
        {activeTab === "passwordManagement" && (
          <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-emerald-600">
            <h2 className="text-xl font-bold text-gray-800 mb-4">User Password Management</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          u.role === "ADMIN" ? "bg-purple-100 text-purple-800" :
                          u.role.includes("HR") ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.isActive ? "Active" : "Inactive"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openResetModal(u)}
                          className="text-amber-600 hover:text-amber-900"
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Password Reset Modal */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reset Password</h3>
            <p className="text-sm text-gray-500 mb-4">
              Enter a new password for <strong>{selectedUser.email}</strong>.
            </p>
            <form onSubmit={handleSubmitReset(onResetPassword)}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input
                  type="text"
                  {...registerReset("newPassword", { required: true, minLength: 6 })}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter new password"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
                >
                  Confirm Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;