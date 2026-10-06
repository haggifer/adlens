import { api } from '@/api/client'
import { RequestErrorCode } from 'adlens-shared'
import { AxiosError, type AxiosResponse } from 'axios'
import { getAdmissionRefusal } from './jobs'

jest.mock('@/api/client', () => ({ api: { get: jest.fn() } }))

const refusedWith = (status: number, errorCode: RequestErrorCode) =>
    new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status,
        data: { statusCode: status, errorCode, message: 'refused' },
    } as AxiosResponse)

describe('getAdmissionRefusal', () => {
    it('is null when the API would admit a new analysis', async () => {
        jest.mocked(api.get).mockResolvedValueOnce({ status: 204 })

        expect(await getAdmissionRefusal()).toBeNull()
        expect(api.get).toHaveBeenCalledWith('/v1/admission')
    })

    it('is the refusal creating the job would answer', async () => {
        jest.mocked(api.get).mockRejectedValueOnce(refusedWith(429, RequestErrorCode.SignUpRequired))

        expect(await getAdmissionRefusal()).toBe(RequestErrorCode.SignUpRequired)
    })

    it('stays a failure for anything that isn’t such a refusal', async () => {
        jest.mocked(api.get).mockRejectedValueOnce(refusedWith(500, RequestErrorCode.Internal))

        await expect(getAdmissionRefusal()).rejects.toBeInstanceOf(AxiosError)
    })
})
