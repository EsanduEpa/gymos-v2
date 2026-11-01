import {
  configurationReadSchema, createdMembershipPlanSchema, createMembershipPlanSchema, gymPublicProfileSchema, gymThemeSettingsSchema,
  membershipEligibilitySchema, renewalResultSchema, renewMembershipSchema, updateConfigurationSchema, updateGymPublicProfileSchema, updateGymThemeSchema,
} from '@gymos/contracts';
import type { RequestOptions } from './index.js';

type Requester = { request<T>(path: string, options: RequestOptions<T>): Promise<T> };
export const gymConfigurationApi = (client: Requester) => ({
  read: (slug: string, accessToken: string) => client.request(`/gyms/${encodeURIComponent(slug)}/configuration`, { response: configurationReadSchema, accessToken }),
  update: (slug: string, accessToken: string, body: unknown) => client.request(`/gyms/${encodeURIComponent(slug)}/configuration`, { method: 'POST', response: configurationReadSchema.shape.configuration, accessToken, body: updateConfigurationSchema.parse(body) }),
  createPlan: (slug: string, accessToken: string, body: unknown) => client.request(`/gyms/${encodeURIComponent(slug)}/membership-plans`, { method: 'POST', response: createdMembershipPlanSchema, accessToken, body: createMembershipPlanSchema.parse(body) }),
  eligibility: (slug: string, memberId: string, accessToken: string) => client.request(`/gyms/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}/membership-eligibility`, { response: membershipEligibilitySchema, accessToken }),
  renew: (slug: string, memberId: string, accessToken: string, body: unknown) => client.request(`/gyms/${encodeURIComponent(slug)}/members/${encodeURIComponent(memberId)}/memberships`, { method: 'POST', response: renewalResultSchema, accessToken, body: renewMembershipSchema.parse(body) }),
  theme: (slug: string, accessToken: string) => client.request(`/gyms/${encodeURIComponent(slug)}/theme/settings`, { response: gymThemeSettingsSchema, accessToken }),
  updateTheme: (slug: string, accessToken: string, body: unknown) => client.request(`/gyms/${encodeURIComponent(slug)}/theme`, { method: 'PATCH', response: gymThemeSettingsSchema, accessToken, body: updateGymThemeSchema.parse(body) }),
  publicProfile: (slug: string, accessToken: string) => client.request(`/gyms/${encodeURIComponent(slug)}/public-profile`, { response: gymPublicProfileSchema, accessToken }),
  updatePublicProfile: (slug: string, accessToken: string, body: unknown) => client.request(`/gyms/${encodeURIComponent(slug)}/public-profile`, { method: 'PATCH', response: gymPublicProfileSchema, accessToken, body: updateGymPublicProfileSchema.parse(body) }),
});
