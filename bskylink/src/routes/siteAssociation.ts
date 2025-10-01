import {type Express} from 'express'

import {type AppContext} from '../context.js'

export default function (ctx: AppContext, app: Express) {
  const {appId, appClipId} = ctx.cfg.service
  return app.get('/.well-known/apple-app-site-association', (req, res) => {
    res.json({
      applinks: {
        apps: [],
        details: [
          {
            appID: appId,
            paths: ['*'],
          },
        ],
      },
      appclips: {
        apps: [appClipId],
      },
    })
  })
}
