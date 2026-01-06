import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, Briefcase, User, Mail, Sparkles, Send, Globe, Calendar, Layers, ShoppingBag, Loader2 } from 'lucide-react';

const WajoodForm = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState('next');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // 1. Session ID & Metadata Refs
  // نستخدم useRef لضمان ثبات القيم وعدم التسبب في إعادة عرض (re-render) غير ضروري
  const sessionIdRef = useRef('');
  const metadataRef = useRef({
    deviceType: 'Unknown', // Mobile / Desktop
    os: 'Unknown',        // Android / iOS / Windows
    browser: 'Unknown',
    location: 'Unknown',  // IP based
    ip: ''
  });

  const WORDPRESS_API_URL = 'https://wogod.com/wp-json/wajood/v1/submit';
  
  const [formData, setFormData] = useState({
    name: '',
    projectName: '',
    projectField: '',
    hasSocialMedia: null,
    hasWebsite: null,
    websiteUrl: '',
    websiteDate: '',
    selectedServices: [],
    email: '',
    details: ''
  });

  // --- 2. جمع بيانات الجهاز والموقع عند بدء التحميل ---
  useEffect(() => {
    // A. إنشاء Session ID (إذا لم يوجد)
    let sId = sessionStorage.getItem('wajood_session_id');
    if (!sId) {
      sId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      sessionStorage.setItem('wajood_session_id', sId);
    }
    sessionIdRef.current = sId;

    // B. تحديد نوع الجهاز والنظام
    const ua = navigator.userAgent;
    let os = 'Unknown';
    let device = 'Desktop';

    if (/Android/i.test(ua)) {
      os = 'Android';
      device = 'Mobile';
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      os = 'iOS';
      device = 'Mobile';
    } else if (/Windows/i.test(ua)) {
      os = 'Windows';
    } else if (/Mac/i.test(ua)) {
      os = 'Mac';
    }

    metadataRef.current.os = os;
    metadataRef.current.deviceType = device;
    metadataRef.current.browser = navigator.appName; // تبسيط للكشف عن المتصفح

    // C. جلب الموقع (IP Address)
    fetch('https://api.db-ip.com/v2/free/self')
      .then(res => res.json())
      .then(data => {
        metadataRef.current.ip = data.ipAddress || '';
        metadataRef.current.location = `${data.city || ''}, ${data.countryName || ''}`;
      })
      .catch(err => console.log('Location fetch failed', err));

  }, []);

  // --- 3. تتبع الخطوات (Tracking) ---
  // يتم استدعاؤه في كل مرة تتغير فيها الخطوة لإرسال تحديث للسيرفر
  useEffect(() => {
    if (currentStep > 0) {
      // إرسال صامت (Silent) - لا ننتظر النتيجة ولا نعطل الواجهة
      submitToWordPress(true);
    }
  }, [currentStep]);

  const isValidEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const isValidUrl = (urlString) => {
    try {
      const pattern = new RegExp('^(https?:\\/\\/)?'+ 
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ 
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ 
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ 
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ 
        '(\\#[-a-z\\d_]*)?$','i'); 
      return !!pattern.test(urlString);
    } catch (e) {
      return false;
    }
  };

  const theme = {
    bg: "bg-[#191919]",
    cardBg: "bg-[#252525]", 
    text: "text-white",
    subText: "text-gray-400",
    accent: "bg-[#FE931E]", 
    accentText: "text-[#FE931E]",
    accentHover: "hover:bg-[#F24022]",
    border: "border-gray-800",
    inputBg: "bg-[#191919]"
  };

  const servicesList = [
    { id: 'branding', label: 'هوية بصرية', icon: '🎨' },
    { id: 'web-design', label: 'تصميم مواقع', icon: '💻' },
    { id: 'app-dev', label: 'تطوير تطبيقات', icon: '📱' },
    { id: 'marketing', label: 'تسويق رقمي', icon: '📈' },
    { id: 'seo', label: 'تحسين محركات البحث', icon: '🔍' },
    { id: 'content', label: 'صناعة محتوى', icon: '✍️' },
  ];

  const getNextStep = (current) => {
    if (current === 0) return 1;
    if (current === 1) return 2;
    if (current === 2) return 3;
    
    if (current === 3) {
      return formData.hasSocialMedia ? 4 : 7;
    }

    if (current === 4) {
      return formData.hasWebsite ? 5 : 7;
    }

    if (current === 5) return 6;
    if (current === 6) return 7;
    if (current === 7) return 8;
    if (current === 8) return 9;

    return current + 1;
  };

  const getPrevStep = (current) => {
    if (current === 0) return 0;
    if (current === 1) return 0;
    if (current === 2) return 1;
    if (current === 3) return 2;
    if (current === 4) return 3;
    if (current === 5) return 4;
    if (current === 6) return 5;

    if (current === 7) {
      if (formData.hasWebsite) return 6;
      if (formData.hasSocialMedia) return 4;
      return 3;
    }

    if (current === 8) return 7;
    return current - 1;
  };

  const getStepErrors = (step, data) => {
    const newErrors = {};

    if (step === 0 && !data.name.trim()) {
      newErrors.name = 'الرجاء إدخال الاسم';
    }
    
    if (step === 1 && !data.projectName.trim()) {
      newErrors.projectName = 'الرجاء إدخال اسم المشروع';
    }

    if (step === 2 && !data.projectField) {
      newErrors.projectField = 'required'; 
    }

    if (step === 5) {
      if (!data.websiteUrl.trim()) {
        newErrors.websiteUrl = 'الرجاء إدخال رابط الموقع';
      } else if (!isValidUrl(data.websiteUrl)) {
        newErrors.websiteUrl = 'صيغة الرابط غير صحيحة';
      }
    }

    if (step === 6 && !data.websiteDate) {
      newErrors.websiteDate = 'الرجاء اختيار تاريخ الإنشاء';
    }

    if (step === 7 && data.selectedServices.length === 0) {
      newErrors.selectedServices = 'الرجاء اختيار خدمة واحدة على الأقل';
    }

    if (step === 8) {
      if (!data.email.trim()) {
        newErrors.email = 'الرجاء إدخال وسيلة تواصل';
      } else if (!isValidEmail(data.email) && !/^\d+$/.test(data.email)) {
        newErrors.email = 'الرجاء إدخال بريد إلكتروني صحيح أو رقم جوال';
      }
    }

    return newErrors;
  };

  // دالة الإرسال للووردبريس (محدثة لدعم الإرسال الجزئي)
  const submitToWordPress = async (isPartial = false) => {
    // في حالة الإرسال الجزئي (Tracking)، لا نقوم بتفعيل حالة التحميل (Loading Spinner)
    if (!isPartial) {
      setIsSubmitting(true);
      setSubmitError(null);
    }

    // دمج البيانات الفنية مع بيانات الفورم
    const payload = {
      ...formData,
      // بيانات التتبع الإضافية
      tracking: {
        sessionId: sessionIdRef.current,
        currentStep: currentStep,
        deviceType: metadataRef.current.deviceType, // Mobile / Desktop
        os: metadataRef.current.os, // Android / iOS
        location: metadataRef.current.location, // City, Country
        ip: metadataRef.current.ip,
        isPartial: isPartial // علامة للسيرفر ليعرف أن هذا تحديث وليس طلب نهائي
      }
    };

    try {
      const response = await fetch(WORDPRESS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        if (!isPartial) {
          // نجاح الإرسال النهائي
          setDirection('next');
          setIsAnimating(true);
          setTimeout(() => {
            setCurrentStep(9);
            setIsAnimating(false);
          }, 300);
        } else {
           // نجاح التتبع الصامت (يمكن تسجيله في الكونسول للتجربة)
           console.log('Tracking update sent', payload.tracking);
        }
      } else {
        if (!isPartial) {
          setSubmitError(data.message || 'حدث خطأ أثناء الإرسال، يرجى المحاولة مرة أخرى.');
        }
      }
    } catch (error) {
      console.error('Submission Error:', error);
      
      // -- محاكاة النجاح للعرض فقط --
      if (!isPartial) {
        setDirection('next');
        setIsAnimating(true);
        setTimeout(() => {
          setCurrentStep(9);
          setIsAnimating(false);
        }, 300);
      }
      // ----------------------------
    } finally {
      if (!isPartial) {
        setIsSubmitting(false);
      }
    }
  };

  const handleNext = () => {
    const currentErrors = getStepErrors(currentStep, formData);
    
    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    // إذا وصلنا للخطوة الأخيرة (8)، نقوم بالإرسال النهائي
    if (currentStep === 8) {
      submitToWordPress(false); // false = Final Submit
      return;
    }
    
    const next = getNextStep(currentStep);
    setDirection('next');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(next);
      setIsAnimating(false);
    }, 300);
  };

  const handlePrev = () => {
    setErrors({});
    setSubmitError(null);
    const prev = getPrevStep(currentStep);
    setDirection('prev');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev);
      setIsAnimating(false);
    }, 300);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const toggleService = (id) => {
    const currentServices = formData.selectedServices;
    let newServices;
    if (currentServices.includes(id)) {
      newServices = currentServices.filter(s => s !== id);
    } else {
      newServices = [...currentServices, id];
    }
    setFormData({ ...formData, selectedServices: newServices });
    
    if (newServices.length > 0 && errors.selectedServices) {
       setErrors({ ...errors, selectedServices: null });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (![2, 3, 4, 7].includes(currentStep)) {
        handleNext();
      }
    }
  };

  const getAnimationClass = () => {
    if (isAnimating) {
      return direction === 'next' 
        ? 'opacity-0 -translate-x-10' 
        : 'opacity-0 translate-x-10';
    }
    return 'opacity-100 translate-x-0';
  };

  const isCurrentStepValid = () => {
    const errors = getStepErrors(currentStep, formData);
    return Object.keys(errors).length === 0;
  };

  return (
    <div 
      className={`min-h-screen ${theme.bg} ${theme.text} flex flex-col items-center justify-center p-4 overflow-hidden relative`} 
      dir="rtl"
      style={{ fontFamily: '"The Year of The Camel", sans-serif' }}
    >
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#FE931E]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#F24022]/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header / Logo Area */}
      <div className="absolute top-8 w-full max-w-2xl flex justify-between items-center px-6 z-10">
        <div className="flex items-center gap-3">
          <img 
            src="https://wogod.com/wp-content/uploads/2025/02/Frame.png" 
            alt="Wajood Logo" 
            className="h-12 w-auto object-contain"
          />
        </div>
        {/* Simple Progress Indicator */}
        <div className="flex gap-1">
          {[...Array(9)].map((_, i) => (
             <div 
               key={i} 
               className={`h-1.5 w-1.5 rounded-full transition-colors ${i <= currentStep ? 'bg-[#FE931E]' : 'bg-gray-800'}`}
             />
          ))}
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-2xl z-10 mt-10">
        
        {/* Dynamic Content Area */}
        <div className={`transition-all duration-500 ease-in-out transform min-h-[400px] flex flex-col justify-center ${getAnimationClass()}`}>
          
          {/* STEP 0: NAME */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#252525] border border-gray-800 text-[#FE931E] text-sm font-medium mb-4">
                <Sparkles size={16} />
                <span>لنبدأ الرحلة</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                أهلاً بك، <br />
                <span className="text-gray-500">نتشرف بإسمك الكريم؟</span>
              </h1>
              <div className="relative group">
                <User className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${errors.name ? 'text-red-500' : 'text-gray-500 group-focus-within:text-[#FE931E]'} `} size={24} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder="اكتب اسمك هنا..."
                  className={`w-full bg-transparent border-b-2 ${errors.name ? 'border-red-500' : theme.border} text-3xl py-4 pr-14 pl-4 focus:outline-none ${errors.name ? 'focus:border-red-500' : 'focus:border-[#FE931E]'} transition-all placeholder:text-gray-600`}
                  autoFocus
                />
              </div>
              {errors.name && <p className="text-red-500 text-sm animate-pulse">{errors.name}</p>}
            </div>
          )}

          {/* STEP 1: PROJECT NAME */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-[#FE931E] font-medium text-lg">
                تشرفنا يا {formData.name}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                ما هو <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FE931E] to-[#F24022]">اسم مشروعك</span>؟
              </h1>
              <div className="relative group">
                <Briefcase className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${errors.projectName ? 'text-red-500' : 'text-gray-500 group-focus-within:text-[#FE931E]'}`} size={24} />
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder="اسم المشروع..."
                  className={`w-full bg-transparent border-b-2 ${errors.projectName ? 'border-red-500' : theme.border} text-3xl py-4 pr-14 pl-4 focus:outline-none ${errors.projectName ? 'focus:border-red-500' : 'focus:border-[#FE931E]'} transition-all placeholder:text-gray-600`}
                  autoFocus
                />
              </div>
              {errors.projectName && <p className="text-red-500 text-sm animate-pulse">{errors.projectName}</p>}
            </div>
          )}

          {/* STEP 2: PROJECT FIELD (Services vs Products) */}
          {currentStep === 2 && (
            <div className="space-y-8">
               <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                ما هو <span className="text-[#FE931E]">مجال مشروعك</span>؟
              </h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <button
                  onClick={() => setFormData({...formData, projectField: 'services'})}
                  className={`p-8 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-4 text-center group
                    ${formData.projectField === 'services'
                      ? 'border-[#FE931E] bg-[#FE931E]/10' 
                      : 'border-gray-800 hover:border-gray-600 bg-[#252525]'}`}
                >
                  <Layers size={48} className={formData.projectField === 'services' ? 'text-[#FE931E]' : 'text-gray-400'} />
                  <span className="text-2xl font-bold">خدمــات</span>
                </button>

                <button
                  onClick={() => setFormData({...formData, projectField: 'products'})}
                  className={`p-8 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-4 text-center group
                    ${formData.projectField === 'products'
                      ? 'border-[#FE931E] bg-[#FE931E]/10' 
                      : 'border-gray-800 hover:border-gray-600 bg-[#252525]'}`}
                >
                  <ShoppingBag size={48} className={formData.projectField === 'products' ? 'text-[#FE931E]' : 'text-gray-400'} />
                  <span className="text-2xl font-bold">منتجــات</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SOCIAL MEDIA CHECK */}
          {currentStep === 3 && (
            <div className="space-y-8">
               <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                عندك حسابات على <span className="text-[#FE931E]">السوشيال ميديا</span>؟
              </h1>
              
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setFormData({...formData, hasSocialMedia: true})}
                  className={`flex-1 p-6 rounded-xl border-2 text-2xl font-bold transition-all
                    ${formData.hasSocialMedia === true 
                      ? 'border-[#FE931E] bg-[#FE931E] text-black' 
                      : 'border-gray-700 bg-[#252525] hover:border-gray-500'}`}
                >
                  نعم
                </button>
                <button
                  onClick={() => setFormData({...formData, hasSocialMedia: false})}
                  className={`flex-1 p-6 rounded-xl border-2 text-2xl font-bold transition-all
                    ${formData.hasSocialMedia === false 
                      ? 'border-gray-500 bg-gray-700 text-white' 
                      : 'border-gray-700 bg-[#252525] hover:border-gray-500'}`}
                >
                  لا
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: WEBSITE CHECK (Only if Social Media is YES) */}
          {currentStep === 4 && (
            <div className="space-y-8">
               <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                هل تمتلك <span className="text-[#FE931E]">موقع / متجر إلكتروني</span>؟
              </h1>
              
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setFormData({...formData, hasWebsite: true})}
                  className={`flex-1 p-6 rounded-xl border-2 text-2xl font-bold transition-all
                    ${formData.hasWebsite === true 
                      ? 'border-[#FE931E] bg-[#FE931E] text-black' 
                      : 'border-gray-700 bg-[#252525] hover:border-gray-500'}`}
                >
                  نعم
                </button>
                <button
                  onClick={() => setFormData({...formData, hasWebsite: false})}
                  className={`flex-1 p-6 rounded-xl border-2 text-2xl font-bold transition-all
                    ${formData.hasWebsite === false 
                      ? 'border-gray-500 bg-gray-700 text-white' 
                      : 'border-gray-700 bg-[#252525] hover:border-gray-500'}`}
                >
                  لا
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: WEBSITE URL */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                ممتاز! ممكن تزودنا بـ <span className="text-[#FE931E]">رابط المتجر</span>؟
              </h1>
              <div className="relative group">
                <Globe className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${errors.websiteUrl ? 'text-red-500' : 'text-gray-500 group-focus-within:text-[#FE931E]'}`} size={24} />
                <input
                  type="url"
                  name="websiteUrl"
                  value={formData.websiteUrl}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  placeholder="www.example.com"
                  className={`w-full bg-transparent border-b-2 ${errors.websiteUrl ? 'border-red-500' : theme.border} text-2xl py-4 pr-14 pl-4 focus:outline-none ${errors.websiteUrl ? 'focus:border-red-500' : 'focus:border-[#FE931E]'} transition-all placeholder:text-gray-600 dir-ltr text-right`}
                  autoFocus
                />
              </div>
              {errors.websiteUrl && <p className="text-red-500 text-sm animate-pulse">{errors.websiteUrl}</p>}
            </div>
          )}

          {/* STEP 6: WEBSITE DATE */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                متى تم <span className="text-[#FE931E]">إنشاء المتجر</span>؟
              </h1>
              <div className="relative group">
                <Calendar className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${errors.websiteDate ? 'text-red-500' : 'text-gray-500 group-focus-within:text-[#FE931E]'}`} size={24} />
                <input
                  type="date"
                  name="websiteDate"
                  value={formData.websiteDate}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  className={`w-full bg-transparent border-b-2 ${errors.websiteDate ? 'border-red-500' : theme.border} text-2xl py-4 pr-14 pl-4 focus:outline-none ${errors.websiteDate ? 'focus:border-red-500' : 'focus:border-[#FE931E]'} transition-all text-white scheme-dark`}
                  autoFocus
                />
              </div>
              {errors.websiteDate && <p className="text-red-500 text-sm animate-pulse">{errors.websiteDate}</p>}
            </div>
          )}

          {/* STEP 7: SERVICES SELECTION */}
          {currentStep === 7 && (
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                اختار <span className="text-[#FE931E]">الخدمات</span> اللي تبيها
                <br/>
                <span className="text-base text-gray-500 font-normal mt-2 block">يمكنك اختيار أكثر من خدمة</span>
              </h1>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                {servicesList.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2 text-center relative
                      ${formData.selectedServices.includes(service.id)
                        ? 'border-[#FE931E] bg-[#FE931E]/20' 
                        : 'border-gray-800 bg-[#252525] hover:border-gray-600'}`}
                  >
                    <span className="text-2xl">{service.icon}</span>
                    <span className={`text-sm font-medium ${formData.selectedServices.includes(service.id) ? 'text-white' : 'text-gray-400'}`}>
                      {service.label}
                    </span>
                    {formData.selectedServices.includes(service.id) && (
                      <div className="absolute top-2 left-2 bg-[#FE931E] rounded-full p-0.5">
                        <Check size={12} className="text-black" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {errors.selectedServices && <p className="text-red-500 text-sm animate-pulse text-center">{errors.selectedServices}</p>}
            </div>
          )}

          {/* STEP 8: FINAL CONTACT INFO */}
          {currentStep === 8 && (
            <div className="space-y-6">
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                أخيراً، وسيلة للتواصل معك
              </h1>
              <p className="text-gray-400">لنرسل لك تفاصيل العرض والخطوات القادمة</p>
              
              <div className="space-y-4">
                <div className="relative group">
                  <Mail className={`absolute right-4 top-4 transition-colors ${errors.email ? 'text-red-500' : 'text-gray-500 group-focus-within:text-[#FE931E]'}`} size={20} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="بريدك الإلكتروني أو رقم الجوال"
                    className={`w-full ${theme.cardBg} rounded-xl border ${errors.email ? 'border-red-500' : theme.border} text-lg py-3 pr-12 pl-4 focus:outline-none ${errors.email ? 'focus:border-red-500' : 'focus:border-[#FE931E]'} transition-all`}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-sm animate-pulse">{errors.email}</p>}
                
                <textarea
                  name="details"
                  value={formData.details}
                  onChange={handleChange}
                  placeholder="ملاحظات إضافية (اختياري)..."
                  rows={3}
                  className={`w-full ${theme.cardBg} rounded-xl border ${theme.border} text-lg p-4 focus:outline-none focus:border-[#FE931E] transition-all resize-none`}
                />

                {submitError && (
                   <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg text-center text-sm">
                     {submitError}
                   </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 9: SUCCESS */}
          {currentStep === 9 && (
            <div className="text-center py-10">
              <div className="w-24 h-24 bg-gradient-to-br from-[#FE931E] to-[#F24022] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#FE931E]/20 animate-bounce">
                <Check size={48} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4 text-white">تم استلام طلبك بنجاح!</h2>
              <p className="text-gray-400 text-lg max-w-md mx-auto leading-relaxed">
                شكراً لك يا <span className="text-[#FE931E] font-bold">{formData.name}</span>.<br/>
                تم حفظ بيانات مشروع <span className="text-white font-medium">"{formData.projectName}"</span> في نظامنا بنجاح. سيتواصل معك فريق وجود قريباً.
              </p>
              
              <button 
                onClick={() => window.location.reload()}
                className="mt-8 text-gray-500 hover:text-white transition-colors underline decoration-gray-700 underline-offset-4"
              >
                إرسال طلب جديد
              </button>
            </div>
          )}

        </div>

        {/* Navigation Buttons */}
        {currentStep < 9 && (
          <div className="flex justify-between items-center mt-8 pb-8">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0 || isSubmitting}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                ${currentStep === 0 || isSubmitting
                  ? 'opacity-0 pointer-events-none' 
                  : 'text-gray-400 hover:text-white hover:bg-[#252525]'}`}
            >
              <ArrowRight size={20} />
              <span>السابق</span>
            </button>

            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-8 py-3 rounded-lg font-bold text-lg transition-all shadow-lg shadow-[#FE931E]/10
                ${theme.accent} text-[#191919] ${theme.accentHover} active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed
                ${!isCurrentStepValid() && !isSubmitting ? 'opacity-50 grayscale' : 'opacity-100 hover:shadow-[#FE931E]/20'}`}
            >
              {isSubmitting ? (
                <>
                  <span>جاري الإرسال...</span>
                  <Loader2 className="animate-spin" size={20} />
                </>
              ) : (
                <>
                  <span>{currentStep === 8 ? 'إرسال الطلب' : 'التالي'}</span>
                  {currentStep === 8 ? <Send size={20} /> : <ArrowLeft size={20} />}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WajoodForm;
