import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'SOURCE_MANAGER' | 'VIEWER';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ImagingSource {
  id: string;
  name: string;
  description?: string;
  datastoreId: string;
  region: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  owner: Partial<User>;
}

export interface CreateImagingSourceRequest {
  name: string;
  description?: string;
  datastoreId: string;
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

export interface Patient {
  patientId: string;
  patientName: string;
  patientBirthDate?: string;
  patientSex?: string;
  studies: Study[];
}

export interface Study {
  imageSetId: string;
  studyInstanceUID: string;
  studyDate?: string;
  studyTime?: string;
  studyDescription?: string;
  modality?: string;
  numberOfStudyRelatedSeries?: number;
  numberOfStudyRelatedInstances?: number;
}

export interface SearchPatientsRequest {
  sourceId: string;
  search?: string;
  limit?: number;
  nextToken?: string;
}

export interface SearchPatientsResponse {
  patients: Patient[];
  nextToken?: string;
  total: number;
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Auth', 'ImagingSources', 'Patients', 'Studies'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    // Imaging Sources endpoints
    getImagingSources: builder.query<ImagingSource[], void>({
      query: () => '/imaging-sources',
      providesTags: ['ImagingSources'],
    }),
    getImagingSource: builder.query<ImagingSource, string>({
      query: (id) => `/imaging-sources/${id}`,
      providesTags: (result, error, id) => [{ type: 'ImagingSources', id }],
    }),
    createImagingSource: builder.mutation<ImagingSource, CreateImagingSourceRequest>({
      query: (data) => ({
        url: '/imaging-sources',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ImagingSources'],
    }),
    updateImagingSource: builder.mutation<
      ImagingSource,
      { id: string; data: Partial<CreateImagingSourceRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/imaging-sources/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'ImagingSources', id }],
    }),
    deleteImagingSource: builder.mutation<void, string>({
      query: (id) => ({
        url: `/imaging-sources/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ImagingSources'],
    }),
    grantAccess: builder.mutation<void, { sourceId: string; userId: string }>({
      query: ({ sourceId, userId }) => ({
        url: `/imaging-sources/${sourceId}/grant`,
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: (result, error, { sourceId }) => [
        { type: 'ImagingSources', id: sourceId },
      ],
    }),

    // Patients endpoints
    searchPatients: builder.query<SearchPatientsResponse, SearchPatientsRequest>({
      query: (params) => ({
        url: '/patients',
        params,
      }),
      providesTags: ['Patients'],
    }),
    getPatientStudies: builder.query<Study[], { patientId: string; sourceId: string }>({
      query: ({ patientId, sourceId }) => ({
        url: `/patients/${patientId}/studies`,
        params: { sourceId },
      }),
      providesTags: (result, error, { patientId }) => [{ type: 'Studies', id: patientId }],
    }),

    // Studies endpoints
    getStudyMetadata: builder.query<any, { imageSetId: string; sourceId: string }>({
      query: ({ imageSetId, sourceId }) => ({
        url: `/studies/${imageSetId}/metadata`,
        params: { sourceId },
      }),
      providesTags: (result, error, { imageSetId }) => [
        { type: 'Studies', id: imageSetId },
      ],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetImagingSourcesQuery,
  useGetImagingSourceQuery,
  useCreateImagingSourceMutation,
  useUpdateImagingSourceMutation,
  useDeleteImagingSourceMutation,
  useGrantAccessMutation,
  useSearchPatientsQuery,
  useGetPatientStudiesQuery,
  useGetStudyMetadataQuery,
} = api;
