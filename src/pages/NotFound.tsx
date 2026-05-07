
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import BottomNavigation from "@/components/layout/BottomNavigation";
import { SEOHead } from '@/components/seo/SEOHead';
import "./NotFound.css";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="الصفحة غير موجودة (404) - منصة كتبي"
        description="عذراً، الصفحة التي تبحث عنها غير موجودة. يمكنك العودة للصفحة الرئيسية واستكشاف آلاف الكتب العربية المجانية."
        noindex={true}
      />
      <Navbar />
      
      <section className="page_404 flex-1">
        <div className="container">
          <div className="row">	
            <div className="col-sm-12">
              <div className="col-sm-10 col-sm-offset-1 text-center">
                <div className="four_zero_four_bg">
                  <h1 className="text-center">404</h1>
                </div>
                
                <div className="contant_box_404">
                  <h3 className="h2">
                    يبدو أنك تائه
                  </h3>
                  
                  <p>الصفحة التي تبحث عنها غير متاحة!</p>
                  
                  <button 
                    onClick={() => navigate('/')} 
                    className="link_404"
                  >
                    العودة للرئيسية
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <BottomNavigation />
    </div>
  );
};

export default NotFound;
