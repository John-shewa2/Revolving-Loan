import { useForm } from "react-hook-form";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import Logo from "../assets/Logo.png"; 

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in based on Role
  useEffect(() => {
    if (user) {
      switch (user.role) {
        case "ADMIN": navigate("/admin"); break;
        case "HR_OFFICER": navigate("/hr-officer"); break;
        case "HR_MANAGER": navigate("/hr-manager"); break;
        case "EMPLOYEE": navigate("/employee"); break;
        default: navigate("/login");
      }
    }
  }, [user, navigate]);

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      toast.success("Login successful!");
    } catch (error) {
      toast.error("Invalid credentials");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Toaster position="top-right" />
      
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-emerald-700">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <img src={Logo} alt="DBE Logo" className="w-24 h-24 mb-4 object-contain" />
          <h2 className="text-2xl font-bold text-emerald-800 text-center uppercase tracking-wide">
            Revolving Loan Portal
          </h2>
          <p className="text-sm text-gray-500 mt-1">Development Bank of Ethiopia</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              {...register("email", { required: "Email is required" })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition duration-200"
            />
            {errors.email && <span className="text-red-500 text-xs mt-1">{errors.email.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              {...register("password", { required: "Password is required" })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition duration-200"
            />
            {errors.password && <span className="text-red-500 text-xs mt-1">{errors.password.message}</span>}
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-800 focus:ring-4 focus:ring-emerald-200 transition duration-300 shadow-md"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Development Bank of Ethiopia. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;