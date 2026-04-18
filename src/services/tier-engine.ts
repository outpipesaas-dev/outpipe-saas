import { Lead, LeadTier } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export interface TierResult {
  tier: LeadTier;
  reason: string;
  reasonCodes: string[];
}

export class TierEngine {
  /**
   * Calculate the tier for a lead based on current data.
   */
  async calculateTier(leadId: string): Promise<TierResult> {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        diagnostics: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!lead) throw new Error("Lead not found");
    if (lead.isTierLocked) {
      return { 
        tier: lead.tier, 
        reason: lead.tierReason || "Manual Override",
        reasonCodes: ['MANUAL_OVERRIDE']
      };
    }

    // 1. Instant Signals (No Diagnostic required)
    if (!lead.website) {
      return { 
        tier: 'HOT', 
        reason: "No website found. Prime candidate for institutional foundation.",
        reasonCodes: ['NO_WEBSITE', 'LOW_TRUST']
      };
    }

    const thirdPartyPatterns = [
      'instagram.com', 'facebook.com', 'fb.com', 'linktr.ee', 
      'setmore.com', 'linktree', 'vagaro.com', 'booker.com'
    ];
    
    if (thirdPartyPatterns.some(pattern => lead.website?.toLowerCase().includes(pattern))) {
      return { 
        tier: 'HOT', 
        reason: "Uses third-party profile as main website. High friction/low authority.",
        reasonCodes: ['THIRD_PARTY_ONLY', 'NO_OWNED_DOMAIN', 'PLATFORM_RISK']
      };
    }

    // 2. Diagnostic-based Signals (If available)
    const diagnostic = lead.diagnostics[0];
    if (diagnostic && diagnostic.status === 'COMPLETED') {
      const audit = (diagnostic.websiteAudit as any) || {};
      const codes: string[] = ['HAS_WEBSITE'];
      
      const hasCta = audit.hasCtaAboveFold;
      const hasBooking = audit.hasBooking;
      const hasLeadCapture = audit.hasLeadForm || audit.hasContactForm;
      const hasModernTech = audit.isModernTech;
      const isEcommerce = audit.hasCheckout;
      const hasTrust = audit.hasTrust;
      const goodPresentation = (audit.imgCount || 0) > 5;

      if (!hasCta) codes.push('NO_CLEAR_CTA');
      if (!hasBooking) codes.push('NO_BOOKING_SYSTEM');
      if (!hasLeadCapture) codes.push('NO_LEAD_FORM');
      if (!hasTrust) codes.push('MISSING_SOCIAL_PROOF');
      if (!goodPresentation) codes.push('LOW_VISUAL_ASSETS');
      if (!hasModernTech) codes.push('OUTDATED_TECH');

      // SKIP Criteria
      if (hasCta && hasBooking && hasLeadCapture && isEcommerce && hasTrust && goodPresentation) {
        return { 
          tier: 'SKIP', 
          reason: "Commercially well-solved across all major pillars.",
          reasonCodes: codes
        };
      }

      // GOOD Criteria (The "Sweet Spot")
      if (!hasTrust || !goodPresentation || !hasCta || (!hasBooking && !hasLeadCapture)) {
        return {
          tier: 'GOOD',
          reason: !hasCta ? "No clear conversion path above the fold." : "Significant commercial gaps detected in trust or booking flow.",
          reasonCodes: codes
        };
      }

      // MAYBE Criteria
      return { 
        tier: 'MAYBE', 
        reason: "Website is functional but lacks modern tech or optimized flow.",
        reasonCodes: codes
      };
    }

    // 3. Fallback (Partial Analysis)
    return { 
      tier: 'MAYBE', 
      reason: "Initial scan complete. Deep commercial audit pending.",
      reasonCodes: ['PARTIAL_ANALYSIS', 'AWAITING_SCAN']
    };
  }

  /**
   * Update lead with new tier and reason.
   */
  async updateLeadTier(leadId: string): Promise<Lead> {
    const { tier, reason, reasonCodes } = await this.calculateTier(leadId);
    return await prisma.lead.update({
      where: { id: leadId },
      data: { 
        tier, 
        tierReason: reason,
        firmographics: { reasonCodes } // Temporarily store here for manual review
      }
    });
  }
}

export const tierEngine = new TierEngine();
