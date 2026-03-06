import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig, Plugin } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Articles } from './collections/Articles'
import { Subscriptions } from './collections/Subscriptions'
import { Categories } from './collections/Categories'
import { Navigation } from './globals/Navigation'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const plugins: Plugin[] = [payloadCloudPlugin()]

if (typeof process.env.BLOB_READ_WRITE_TOKEN === 'string') {
  plugins.push(
    vercelBlobStorage({
      collections: {
        media: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  )
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  onInit: async (payload) => {
    const username = process.env.ROOT_ACCOUNT_USERNAME
    const password = process.env.ROOT_ACCOUNT_PASSWORD

    if (!username || !password) return

    const root = (
      await payload.find({ collection: 'users', where: { username: { equals: username } } })
    ).docs.at(0)

    if (!root) {
      await payload.create({ collection: 'users', data: { username: username, password } })
    }
  },
  collections: [Users, Media, Articles, Subscriptions, Categories],
  globals: [Navigation],
  editor: lexicalEditor(),
  secret:
    process.env.PAYLOAD_SECRET ||
    (() => {
      throw new Error('PAYLOAD_SECRET is not defined')
    })(),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url:
      typeof process.env.DATABASE_URI === 'string'
        ? process.env.DATABASE_URI
        : (() => {
            throw new Error('DATABASE_URI is not defined')
          })(),
  }),
  sharp,
  plugins,
})
