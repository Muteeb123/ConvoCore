import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Contact } from "@shared/schema";
import { format } from "date-fns";
import {
  Mail,
  Phone,
  Globe,
  Linkedin,
  MapPin,
  Clock,
  User,
  Briefcase,
  Building,
  Flag,
  Calendar,
  Hash,
  Globe2,
  Bookmark,
  Activity,
  Navigation,
  Tag,
  Codesandbox,
  Database,
  Edit,
  PlusCircle,
  RefreshCcw,
} from "lucide-react";
import { Avatar, AvatarImage } from "@radix-ui/react-avatar";
import { FALLBACK_URL } from "@/constants/data";

interface ViewContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
}

interface InfoSectionProps {
  title: string;
  children: React.ReactNode;
}

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string | React.ReactNode;
}

const InfoSection: React.FC<InfoSectionProps> = ({ title, children }) => (
  <div className="space-y-4 p-4 ">
    <h4 className="font-medium text-lg">{title}</h4>
    <div className="space-y-2">{children}</div>
  </div>
);

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value }) => (
  <div className="flex items-center space-x-2">
    {icon}
    <div>
      <span className="text-sm text-gray-500">{label}: </span>
      <span>{value || "Not provided"}</span>
    </div>
  </div>
);

export function ViewContactModal({
  isOpen,
  onClose,
  contact,
}: ViewContactModalProps) {
  if (!contact) return null;

  const formatDate = (date?: string | Date) => {
    if (!date) return "Unknown";
    return format(new Date(date), "MMM d, yyyy");
  };
  const fallbackUrl = FALLBACK_URL;
  const [activeTab, setActiveTab] = useState("Professional");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl">Contact Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="flex-1 space-y-4">
              <div className="flex items-center space-x-2">
                {/* <User className="w-5 h-5 text-gray-500" /> */}
                <Avatar className="w-8 h-8 rounded-full overflow-hidden  flex justify-center items-center">
                  <AvatarImage
                    src={contact.avatar ? contact.avatar : fallbackUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {contact.firstName} {contact.lastName}
                  </h3>
                  {contact.jobTitle && (
                    <p className="text-sm text-gray-500">{contact.jobTitle}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 bg-black/[7%]">
                  <InfoSection title="Basic Information" className='border-none'>
                    <InfoItem
                      icon={<User className="w-4 h-4 text-gray-500" />}
                      label="Gender"
                      value={contact.gender}
                    />
                    <InfoItem
                      icon={<Hash className="w-4 h-4 text-gray-500" />}
                      label="Postal Code"
                      value={contact.postalCode}
                    />
                    <InfoItem
                      icon={<Tag className="w-4 h-4 text-gray-500" />}
                      label="List Name"
                      value={contact.listName}
                    />
                    <InfoItem
                      icon={<Activity className="w-4 h-4 text-gray-500" />}
                      label="Contact Status"
                      value={contact.contactUnworked ? "Unworked" : "Worked"}
                    />
                  </InfoSection>
              

                 
                  <InfoSection title="Contact Information">
                    <InfoItem
                      icon={<Mail className="w-4 h-4 text-gray-500" />}
                      label="Email"
                      value={contact.email}
                    />
                    <InfoItem
                      icon={<Phone className="w-4 h-4 text-gray-500" />}
                      label="Phone"
                      value={contact.phone}
                    />
                    <InfoItem
                      icon={<Globe className="w-4 h-4 text-gray-500" />}
                      label="Company Website"
                      value={contact.companyWebsite}
                    />
                    <InfoItem
                      icon={<Globe2 className="w-4 h-4 text-gray-500" />}
                      label="Personal Website"
                      value={contact.websiteUrl}
                    />
                  </InfoSection>
                <InfoSection title="Social & Location">
                    <InfoItem
                      icon={<Linkedin className="w-4 h-4 text-gray-500" />}
                      label="LinkedIn"
                      value={contact.linkedinUrl}
                    />
                    <InfoItem
                      icon={<Navigation className="w-4 h-4 text-gray-500" />}
                      label="LinkedIn Profile"
                      value={contact.linkedinProfile}
                    />
                    <InfoItem
                      icon={<MapPin className="w-4 h-4 text-gray-500" />}
                      label="Region"
                      value={contact.countryRegion}
                    />
                    <InfoItem
                      icon={<Clock className="w-4 h-4 text-gray-500" />}
                      label="Time Zone"
                      value={contact.timeZone}
                    />
                  </InfoSection>
            
              </div>

              <div className="flex gap-2 p-2 flex-wrap justify-between bg-black/[7%]">
              
               
                <button
                 className={`px-7 py-1 ${activeTab === 'Professional'? 'bg-white ': 'bg-none'}`}
                  onClick={() => {
                    setActiveTab(`Professional`);
                  }}
                >
                  Professional
                </button>
             
                <button
                 className={`px-7 py-1 ${activeTab === 'Marketing'? 'bg-white ': 'bg-none'}`}
                  onClick={() => {
                    setActiveTab(`Marketing`);
                  }}
                >
                  Marketing
                </button>
                <button
                 className={`px-7 py-1 ${activeTab === 'Activity'? 'bg-white ': 'bg-none'}`}
                  onClick={() => {
                    setActiveTab(`Activity`);
                  }}
                >Activity</button>
                <button
                 className={`px-7 py-1 ${activeTab === 'Assignment'? 'bg-white ': 'bg-none'}`}
                  onClick={() => {
                    setActiveTab(`Assignment`);
                  }}
                >Assignment</button>
                <button
                 className={`px-7 py-1 ${activeTab === 'Metadata'? 'bg-white ': 'bg-none'}`}
                  onClick={() => {
                    setActiveTab(`Metadata`);
                  }}
                >Metadata</button>
              
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                
                {activeTab === "Professional" && (
                  <InfoSection title="Professional Information">
                    <InfoItem
                      icon={<Briefcase className="w-4 h-4 text-gray-500" />}
                      label="Position"
                      value={contact.jobTitle}
                    />
                    <InfoItem
                      icon={<Building className="w-4 h-4 text-gray-500" />}
                      label="Department"
                      value={contact.department}
                    />
                    <InfoItem
                      icon={<Flag className="w-4 h-4 text-gray-500" />}
                      label="Industry"
                      value={contact.industry}
                    />
                    <InfoItem
                      icon={<Codesandbox className="w-4 h-4 text-gray-500" />}
                      label="Employment Role"
                      value={contact.employmentRole}
                    />
                  </InfoSection>
                )}

          
                {activeTab === "Marketing" && (
                  <InfoSection title="Marketing Information">
                    <InfoItem
                      icon={<Bookmark className="w-4 h-4 text-gray-500" />}
                      label="Marketing Status"
                      value={contact.marketingContactStatus}
                    />
                    <InfoItem
                      icon={<Activity className="w-4 h-4 text-gray-500" />}
                      label="Latest Traffic Source"
                      value={contact.latestTrafficSource}
                    />
                  </InfoSection>
                )}

                {activeTab === "Activity" && (
                  <InfoSection title="Activity Metrics">
                    <InfoItem
                      icon={<Hash className="w-4 h-4 text-gray-500" />}
                      label="Times Contacted"
                      value={contact.numberOfTimesContacted}
                    />
                    <InfoItem
                      icon={<Activity className="w-4 h-4 text-gray-500" />}
                      label="Sales Activities"
                      value={contact.numberOfSalesActivities}
                    />
                  </InfoSection>
                )}

                {activeTab === "Assignment" && (
                  <InfoSection title="Assignment Information">
                    <InfoItem
                      icon={<User className="w-4 h-4 text-gray-500" />}
                      label="Assigned To"
                      value={
                        contact.assignedUserName ||
                        `User ID: ${contact.assignedUserId}`
                      }
                    />
                    <InfoItem
                      icon={<Building className="w-4 h-4 text-gray-500" />}
                      label="Company"
                      value={
                        contact.companyName ||
                        `Company ID: ${contact.companyId}`
                      }
                    />
                  </InfoSection>
                )}

              {activeTab === "Metadata" &&  <InfoSection title="Metadata">
                  <InfoItem
                    icon={<PlusCircle className="w-4 h-4 text-gray-500" />}
                    label="Created"
                    value={
                      <span>
                        {contact.createDate ? (
                          <>
                            {formatDate(contact.createDate)} by{" "}
                            {contact.createdUserName ||
                              `User ID: ${
                                contact.createdByUserId || "Unknown"
                              }`}
                          </>
                        ) : (
                          "Not available"
                        )}
                      </span>
                    }
                  />

                  <InfoItem
                    icon={<Edit className="w-4 h-4 text-gray-500" />}
                    label="Last Modified"
                    value={
                      <span>
                        {contact.lastModifiedDate ? (
                          <>
                            {formatDate(contact.lastModifiedDate)} by{" "}
                            {contact.updatedUserName ||
                              `User ID: ${
                                contact.updatedByUserId || "Unknown"
                              }`}
                          </>
                        ) : (
                          "Not modified"
                        )}
                      </span>
                    }
                  />

                  <InfoItem
                    icon={<Database className="w-4 h-4 text-gray-500" />}
                    label="System Dates"
                    value={
                      <div className="flex flex-col gap-1 mt-3">
                        {contact.createdAt ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-400" />
                            <span>
                              Created at: {formatDate(contact.createdAt)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>Creation date not available</span>
                          </div>
                        )}

                        {contact.updatedAt ? (
                          <div className="flex items-center gap-2">
                            <RefreshCcw className="w-4 h-4 text-green-400" />
                            <span>
                              Updated at: {formatDate(contact.updatedAt)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500">
                            <RefreshCcw className="w-4 h-4" />
                            <span>Update date not available</span>
                          </div>
                        )}
                      </div>
                    }
                  />

                  <InfoItem
                    icon={<Flag className="w-4 h-4 text-gray-500" />}
                    label="Status"
                    value={contact.isActive ? "Active" : "Inactive"}
                  />
                </InfoSection>}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
