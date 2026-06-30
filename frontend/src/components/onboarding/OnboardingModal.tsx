"use client";

import { useState } from "react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Chào mừng bạn đến với Cây Gia Phả\u00a0🌳",
      description: "Nơi lưu giữ và kết nối những ký ức gia đình ấm áp qua nhiều thế hệ Việt.",
      illustration: (
        <svg viewBox="0 0 200 120" width="100%" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Trunk */}
          <path d="M100 110 C100 90, 96 80, 96 70 C96 66, 104 66, 104 70 C104 80, 100 90, 100 110" fill="#8B5A2B"/>
          <path d="M98 75 C85 65, 75 70, 65 60 C55 50, 65 40, 75 45 C85 50, 95 65, 98 75" fill="none" stroke="#8B5A2B" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M102 75 C115 65, 125 70, 135 60 C145 50, 135 40, 125 45 C115 50, 105 65, 102 75" fill="none" stroke="#8B5A2B" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Leaves/Nodes */}
          <circle cx="100" cy="40" r="16" fill="#e5efe7" stroke="#2d6a4f" strokeWidth="2"/>
          <circle cx="65" cy="55" r="13" fill="#e9f5ff" stroke="#0284c7" strokeWidth="2"/>
          <circle cx="135" cy="55" r="13" fill="#fff0f6" stroke="#db2777" strokeWidth="2"/>
          <circle cx="100" cy="72" r="11" fill="#ebe6dd" stroke="#8a8780" strokeWidth="2"/>
          {/* Initial characters representing people */}
          <text x="100" y="44" fontSize="10" fontWeight="bold" fill="#2d6a4f" textAnchor="middle">T</text>
          <text x="65" y="59" fontSize="10" fontWeight="bold" fill="#0284c7" textAnchor="middle">N</text>
          <text x="135" y="59" fontSize="10" fontWeight="bold" fill="#db2777" textAnchor="middle">H</text>
          <text x="100" y="76" fontSize="9" fontWeight="bold" fill="#5d5b54" textAnchor="middle">C</text>
          {/* Heart icon */}
          <path d="M100 24 C100 22, 102 22, 102 24 C102 26, 100 28, 100 28 C100 28, 98 26, 98 24 C98 22, 100 22, 100 24 Z" fill="#b94b34"/>
        </svg>
      )
    },
    {
      title: "Dễ dàng xem cây gia phả",
      description: "Kéo thả để di chuyển, dùng hai ngón tay hoặc cuộn chuột để thu phóng. Bấm vào thành viên để xem nhanh xưng hô và thông tin.",
      illustration: (
        <svg viewBox="0 0 200 120" width="100%" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Canvas grid lines */}
          <path d="M10 20 H190 M10 60 H190 M10 100 H190 M40 10 V110 M100 10 V110 M160 10 V110" stroke="#ede8df" strokeWidth="1"/>
          {/* Zoom outline */}
          <circle cx="100" cy="55" r="28" fill="none" stroke="#b94b34" strokeWidth="1.5" strokeDasharray="3 3"/>
          <path d="M120 35 L130 25 M130 25 H122 M130 25 V33" stroke="#b94b34" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Node representation inside zoom area */}
          <rect x="85" y="45" width="30" height="18" rx="4" fill="#e9f5ff" stroke="#0284c7" strokeWidth="1.5"/>
          <text x="100" y="56" fontSize="8" fill="#1d1c1a" fontWeight="bold" textAnchor="middle">Ông</text>
          {/* Other nodes */}
          <rect x="30" y="45" width="25" height="15" rx="3" fill="#fff0f6" stroke="#db2777" strokeWidth="1" opacity="0.6"/>
          <rect x="145" y="45" width="25" height="15" rx="3" fill="#fff0f6" stroke="#db2777" strokeWidth="1" opacity="0.6"/>
          {/* Hand pointer cursor */}
          <path d="M112 65 L122 80 L117 82 L108 68 L103 72 L101 50 L107 51 L108 60 Z" fill="#1d1c1a" stroke="white" strokeWidth="1.5"/>
        </svg>
      )
    },
    {
      title: "Xây dựng cây gia phả của bạn",
      description: "Nhấn nút + Thêm thành viên để kết nối bố mẹ, ông bà, anh chị em hoặc con cháu của bạn vào sơ đồ dòng tộc.",
      illustration: (
        <svg viewBox="0 0 200 120" width="100%" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Central Add Node focus */}
          <circle cx="100" cy="45" r="22" fill="#b94b34" opacity="0.12"/>
          <circle cx="100" cy="45" r="15" fill="#b94b34"/>
          <path d="M100 39 V51 M94 45 H106" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Connections branching down */}
          <path d="M100 60 V75 M100 75 H55 M100 75 H145 M55 75 V85 M145 75 V85" stroke="#c5beb3" strokeWidth="2"/>
          {/* Node cards below */}
          <rect x="35" y="85" width="40" height="20" rx="5" fill="#e9f5ff" stroke="#0284c7" strokeWidth="1.5"/>
          <text x="55" y="97" fontSize="8" fill="#0284c7" fontWeight="bold" textAnchor="middle">Con trai</text>
          <rect x="125" y="85" width="40" height="20" rx="5" fill="#fff0f6" stroke="#db2777" strokeWidth="1.5"/>
          <text x="145" y="97" fontSize="8" fill="#db2777" fontWeight="bold" textAnchor="middle">Con gái</text>
        </svg>
      )
    },
    {
      title: "Không bao giờ quên ngày quan trọng",
      description: "Hệ thống tự động hiển thị danh sách các ngày giỗ chạp, ngày sinh nhật sắp tới của người thân để gia đình cùng nhớ.",
      illustration: (
        <svg viewBox="0 0 200 120" width="100%" height="120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Calendar grid box */}
          <rect x="65" y="25" width="70" height="70" rx="8" fill="white" stroke="#c5beb3" strokeWidth="2"/>
          {/* Red header banner */}
          <path d="M66 26 H134 V40 H66 Z" fill="#b94b34"/>
          <circle cx="78" cy="33" r="2.5" fill="white"/>
          <circle cx="122" cy="33" r="2.5" fill="white"/>
          {/* Calendar rows/dots */}
          <circle cx="82" cy="55" r="4" fill="#ede8df"/>
          <circle cx="100" cy="55" r="4" fill="#ede8df"/>
          {/* Special date heart mark */}
          <path d="M118 55 C118 53.5, 120 53.5, 120 55 C120 56.5, 118 58, 118 58 C118 58, 116 56.5, 116 55 C116 53.5, 118 53.5, 118 55 Z" fill="#b94b34"/>
          <circle cx="82" cy="72" r="4" fill="#ede8df"/>
          <circle cx="100" cy="72" r="4" fill="#b94b34" opacity="0.2"/>
          <circle cx="100" cy="72" r="2" fill="#b94b34"/>
          {/* Notification bell badge */}
          <circle cx="132" cy="30" r="12" fill="#e5efe7" stroke="#2d6a4f" strokeWidth="1.5"/>
          <text x="132" y="34" fontSize="10" fill="#2d6a4f" fontWeight="bold" textAnchor="middle">🔔</text>
        </svg>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-popup">
        <button
          type="button"
          className="onboarding-close-x"
          onClick={onClose}
          aria-label="Bỏ qua hướng dẫn"
          title="Bỏ qua hướng dẫn"
        >
          &times;
        </button>

        <div className="onboarding-carousel">
          <div
            className="onboarding-carousel__track"
            style={{ transform: `translateX(-${currentStep * 100}%)` }}
          >
            {steps.map((step, idx) => (
              <div key={idx} className="onboarding-slide" aria-hidden={idx !== currentStep}>
                <div className="onboarding-illustration">
                  {step.illustration}
                </div>
                <h2 id={idx === currentStep ? "onboarding-title" : undefined} className="onboarding-title">
                  {step.title}
                </h2>
                <p className="onboarding-description">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="onboarding-footer">
          {/* Left button: Quay lại or Bỏ qua */}
          {currentStep > 0 ? (
            <button
              type="button"
              className="btn btn-secondary onboarding-btn-nav"
              onClick={handleBack}
            >
              Quay lại
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary onboarding-btn-nav"
              onClick={onClose}
            >
              Bỏ qua
            </button>
          )}

          {/* Center: Progress dots */}
          <div className="onboarding-dots" aria-label="Tiến trình hướng dẫn">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`onboarding-dot ${idx === currentStep ? "onboarding-dot--active" : ""}`}
                onClick={() => setCurrentStep(idx)}
                aria-label={`Đi tới bước ${idx + 1}`}
                aria-current={idx === currentStep ? "step" : undefined}
              />
            ))}
          </div>

          {/* Right button: Tiếp tục or Bắt đầu ngay */}
          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              className="btn btn-secondary onboarding-btn-nav"
              onClick={handleNext}
            >
              Tiếp tục
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-terracotta onboarding-btn-nav"
              onClick={onClose}
            >
              Bắt đầu ngay
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
