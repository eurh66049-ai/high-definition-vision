import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();

  // إعادة التوجيه إلى صفحة المصادقة لأن نظام OTP يتم التعامل معه هناك
  useEffect(() => {
    navigate('/auth', { replace: true });
  }, [navigate]);

  return null;
};

export default ResetPassword;
