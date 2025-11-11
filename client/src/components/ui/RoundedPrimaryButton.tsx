import React from "react";
import { Button } from "@/components/ui/button";

interface RoundedPrimaryButtonProps {
  title: string;
  // ✅ Change 'icon' prop to accept a React component
  icon?: React.ReactNode;
  iconAlt?: string;
  onClick?: () => void;
  disabled?: boolean; // This is already optional
}

const RoundedPrimaryButton: React.FC<RoundedPrimaryButtonProps> = ({
  title,
  icon,
  onClick,
  disabled = false, // ✅ Set default value to false here
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled} // Pass disabled (will be false if not provided)
      className="rounded-[64px] inline-flex items-center justify-center font-semibold text-[14px] sm:text-[16px] font-onest leading-[100%] tracking-[-2%] bg-[#5166F1] text-[#FFFFFF] hover:bg-[#5A7FFF] py-[8px] sm:py-[10px] px-[16px] sm:px-[20px] gap-[6px] sm:gap-[10px] transition-all duration-200"
    >
      {/* ✅ Render the icon component directly */}
      {icon && (
        <span className="w-[16px] h-[16px] sm:w-[20px] sm:h-[20px] flex justify-center items-center">
          {icon}
        </span>
      )}
      <span>{title}</span>
    </Button>
  );
};

export default RoundedPrimaryButton;
