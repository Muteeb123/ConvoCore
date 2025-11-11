import React, { useState } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { styled } from "@mui/material/styles";
import { Paper, Popper, ClickAwayListener, Box, Button } from "@mui/material";

const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: "12px",
  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
  overflow: "hidden",
  border: "1px solid #E2E8F0",
  width: "280px", 
  [theme.breakpoints.down('sm')]: {
    width: "260px",
  },
}));

const StyledDateCalendar = styled(DateCalendar)(({ theme }) => ({
  width: "100%",
  maxHeight: "360px", 
  "& .MuiPickersCalendarHeader-root": {
    backgroundColor: "#5A7FFF",
    color: "white",
    paddingTop: "8px",
    paddingBottom: "8px",
    marginTop: 0,
    minHeight: "auto",
  },
  "& .MuiPickersCalendarHeader-label": {
    color: "white",
    fontWeight: 600,
    fontSize: "0.85rem", 
    [theme.breakpoints.down('sm')]: {
      fontSize: "0.8rem",
    },
  },
  "& .MuiPickersArrowSwitcher-button": {
    color: "white",
    padding: "2px", 
    "& svg": {
      fontSize: "1.2rem",
    },
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
  },
  "& .MuiDayCalendar-header": {
    paddingTop: "4px",
  },
  "& .MuiDayCalendar-weekDayLabel": {
    color: "#64748B",
    fontWeight: 600,
    fontSize: "0.7rem", 
    width: "32px",
    height: "32px",
    [theme.breakpoints.down('sm')]: {
      fontSize: "0.65rem",
      width: "30px",
      height: "30px",
    },
  },
  "& .MuiPickersDay-root": {
    fontSize: "0.8rem", 
    fontWeight: 500,
    color: "#1E293B",
    width: "32px", 
    height: "32px",
    margin: "1px",
    [theme.breakpoints.down('sm')]: {
      fontSize: "0.75rem",
      width: "30px",
      height: "30px",
    },
    "&:hover": {
      backgroundColor: "#F0F4FF",
    },
    "&.Mui-selected": {
      backgroundColor: "#5A7FFF",
      color: "white",
      fontWeight: 700,
      "&:hover": {
        backgroundColor: "#4169E1",
      },
    },
    "&.MuiPickersDay-today": {
      border: "2px solid #5A7FFF",
      fontWeight: 700,
      "&:not(.Mui-selected)": {
        backgroundColor: "transparent",
      },
    },
  },
  "& .MuiPickersDay-root.Mui-disabled": {
    color: "#CBD5E1",
  },
  "& .MuiPickersSlideTransition-root": {
    minHeight: "200px",
  },
  "& .MuiDayCalendar-monthContainer": {
    padding: "0 4px",
  },
}));

interface ModernDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  label: string;
}

const ModernDatePicker: React.FC<ModernDatePickerProps> = ({
  value,
  onChange,
  label,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [tempDate, setTempDate] = useState<Date>(value);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
    setTempDate(value);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleApply = () => {
    onChange(tempDate);
    handleClose();
  };

  const handleCancel = () => {
    setTempDate(value);
    handleClose();
  };

  const open = Boolean(anchorEl);
  const id = open ? `date-picker-${label}` : undefined;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="w-full md:w-44">
        <label className="text-xs text-[#64748B] mb-1 block font-medium">
          {label}
        </label>
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm bg-white hover:bg-[#F8FAFC] hover:border-[#5A7FFF] transition-all focus:outline-none focus:ring-2 focus:ring-[#5A7FFF] focus:ring-opacity-50"
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#5A7FFF]" />
            <span className="text-[#1E293B] font-medium">
              {format(value, "MMM dd, yyyy")}
            </span>
          </div>
        </button>

        <Popper
          id={id}
          open={open}
          anchorEl={anchorEl}
          placement="bottom-start"
          style={{ zIndex: 1300 }}
          modifiers={[
            {
              name: "offset",
              options: {
                offset: [0, 8],
              },
            },
            {
              name: "preventOverflow",
              enabled: true,
              options: {
                altAxis: true,
                altBoundary: true,
                tether: true,
                rootBoundary: "viewport",
                padding: 8,
              },
            },
          ]}
        >
          <ClickAwayListener onClickAway={handleClose}>
            <StyledPaper elevation={8}>
              <Box sx={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={handleClose}
                  className="absolute top-1 right-1 z-10 p-0.5 rounded-full hover:bg-white/20 transition-colors"
                  style={{ color: "white" }}
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Calendar */}
                <StyledDateCalendar
                  value={tempDate}
                  onChange={(newValue) => {
                    if (newValue) {
                      setTempDate(newValue);
                    }
                  }}
                />

                {/* Action Buttons */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 0.5,
                    padding: "8px 10px",
                    borderTop: "1px solid #E2E8F0",
                 
                  }}
                >
                  <Button
                    onClick={handleCancel}
                    size="small"
                    className="bg-none"
                    sx={{
                      textTransform: "none",
                      color: "#64748B",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      padding: "3px 10px",
                      minWidth: "auto",
          
                      "&:hover": {
                        backgroundColor: "#E2E8F0",
                      },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApply}
                    variant="contained"
                    size="small"
                    sx={{
                      textTransform: "none",
                    //   backgroundColor: "#5A7FFF",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      padding: "3px 10px",
                      minWidth: "auto",
                      "&:hover": {
                        backgroundColor: "#4169E1",
                      },
                    }}
                  >
                    Apply
                  </Button>
                </Box>
              </Box>
            </StyledPaper>
          </ClickAwayListener>
        </Popper>
      </div>
    </LocalizationProvider>
  );
};

export default ModernDatePicker;