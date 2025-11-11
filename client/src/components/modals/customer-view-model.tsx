import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Customer } from "@shared/schema";
import { Mail, Phone, Globe, MapPin, Calendar, Users, DollarSign, Factory, Link, Twitter, Facebook, Linkedin, Clock, FileText } from "lucide-react";

interface CustomerViewModelProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export function CustomerViewModel({ isOpen, onClose, customer }: CustomerViewModelProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      case "prospect": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {customer?.companyName}
            {customer?.status && (
              <Badge className={getStatusColor(customer.status)}>
                {customer.status}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {customer ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <Section title="Basic Information" icon={<FileText className="w-4 h-4" />}>
                <InfoItem label="Industry" value={customer.industry} />
                <InfoItem label="Lifecycle Stage" value={customer.lifecycleStage} />
                <InfoItem label="Year Founded" value={customer.yearFounded} />
                <InfoItem label="Annual Revenue" value={customer.annualRevenue ? `$${customer.annualRevenue.toLocaleString()}` : null} />
                <InfoItem label="Number of Employees" value={customer.numOfEmployees} />
                <InfoItem label="Description" value={customer.description} className="col-span-2" />
              </Section>

              {/* Contact Information */}
              <Section title="Contact Information" icon={<Mail className="w-4 h-4" />}>
                <InfoItem label="Email" value={customer.email} />
                <InfoItem label="Phone" value={customer.phone} />
                <InfoItem label="Website" value={customer.website} isLink />
                <InfoItem label="Parent Company" value={customer.parentCompany} />
                <InfoItem label="Number of Contacts" value={customer.numOfContacts} />
                <InfoItem label="Times Contacted" value={customer.numOfTimesContacted} />
              </Section>

              {/* Social Media */}
              <Section title="Social Media" icon={<Link className="w-4 h-4" />}>
                <InfoItem label="Twitter" value={customer.twitterHandle} isLink prefix="https://twitter.com/" />
                <InfoItem label="Facebook" value={customer.facebookPage} isLink prefix="https://facebook.com/" />
                <InfoItem label="LinkedIn" value={customer.linkedInHandle} isLink prefix="https://linkedin.com/company/" />
              </Section>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <Section title="Location" icon={<MapPin className="w-4 h-4" />}>
                <InfoItem label="Street" value={customer.street} />
                <InfoItem label="City" value={customer.city} />
                <InfoItem label="State" value={customer.state} />
                <InfoItem label="Postal Code" value={customer.postalCode} />
                <InfoItem label="Country" value={customer.country} />
                <InfoItem label="Time Zone" value={customer.timeZone} />
              </Section>

              {/* Technical Info */}
              <Section title="Technical Information" icon={<Factory className="w-4 h-4" />}>
                <InfoItem label="Web Technologies" value={customer.webTechnologies} />
                <InfoItem label="Original Source" value={customer.originalSource} />
                <InfoItem label="Days to Close" value={customer.daysToClose} />
              </Section>

              {/* Timeline */}
              <Section title="Timeline" icon={<Clock className="w-4 h-4" />}>
                <InfoItem label="Created At" value={customer.createdAt?.toLocaleString()} />
                <InfoItem label="Updated At" value={customer.updatedAt?.toLocaleString()} />
              </Section>

              {/* Notes */}
              {customer.notes && (
                <Section title="Notes" icon={<FileText className="w-4 h-4" />}>
                  <div className="p-3 bg-gray-50 rounded-md text-sm">
                    {customer.notes}
                  </div>
                </Section>
              )}
            </div>
          </div>
        ) : (
          <p>No customer data available</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="flex items-center gap-2 font-medium mb-3">
        {icon}
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );
}

interface InfoItemProps {
  label: string;
  value: string | number | null | undefined;
  className?: string;
  isLink?: boolean;
  prefix?: string;
}

function InfoItem({ label, value, className = '', isLink = false, prefix = '' }: InfoItemProps) {
  if (!value) return null;

  return (
    <div className={`text-sm ${className}`}>
      <p className="text-gray-500">{label}</p>
      {isLink ? (
        <a 
          href={`${prefix}${value}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {value}
        </a>
      ) : (
        <p className="font-medium">{value}</p>
      )}
    </div>
  );
}