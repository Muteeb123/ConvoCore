
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"


///api/leads/totalleadsandopp

interface DashboardCard {
  borderColor: string
  bgColor: string
  icon: string
  title: string
  cardWidth?: number
  cardHeight?: number
  value: string | number
  changeType?: 'positive' | 'negative' | string
  change?: string | number
  changeText?: string
}


interface MetricCardProps {
  card: DashboardCard
  willshow: boolean
}





export function MetricCard({ card, willshow }: MetricCardProps) {

  if (!willshow) return null;
  return (
    <div className="relative pl-6">
      <div 
        className="absolute left-0 top-0 bottom-0 w-0.5 h-[129px] bg-cover bg-center bg-no-repeat rounded-[64px]"
        style={{ backgroundImage: `url(${card.borderColor})` }}
      />

      <div className="flex items-center space-x-3 mb-6">
        <div 
          className="w-[40px] h-[40px] rounded-[64px] gap-[8px] p-[8px] flex items-center justify-center"
          style={{ backgroundColor: card.bgColor }}
        >
          <img 
            src={card.icon} 
            alt={card.title}
            width={card.cardWidth}
            height={card.cardHeight}
          />
        </div>
        <p className="text-[16px] leading-[100%] font-onest tracking-[-2%] font-[400] text-primary-text opacity-50">
          {card.title}
        </p>
      </div>

      <div className="md:text-[32px] sm:text-[26px] text-[20px] font-onest leading-[100%] font-[600] tracking-[-2%] text-primary-text mb-4">
        {card.value}
      </div>
      
      <div className="flex items-center space-x-2">
        <Badge 
          className={cn(
            "rounded-[64px] px-[8px] py-[4px] font-onest",
            card.changeType === 'positive' 
              ? "bg-[#469D4E1A] text-[#469D4E] font-medium text-[14px] leading-[100%] tracking-[-2%]" 
              : "bg-[#9D46461A] text-[#9D4646] font-medium text-[14px] leading-[100%] tracking-[-2%]"
          )}
        >
          {card.change}
        </Badge>
        <p className="text-[14px] font-onest leading-[100%] tracking-[-2%] font-[400] opacity-50 text-primary-text">
          {card.changeText}
        </p>
      </div>
    </div>
  )
}