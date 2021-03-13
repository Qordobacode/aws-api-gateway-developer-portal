'use strict'

const util = require('../../util')

exports.get = async (event, id) => {
  console.log(`GET /catalog/${id}/export for Cognito ID: ${util.getCognitoIdentityId(event)}`)

  // note that we only return an SDK if the API is in the catalog
  // this is important because the lambda function has permission to fetch any API's SDK
  // we don't want to leak customer API shapes if they have privileged APIs not in the catalog
  const [restApiId, stageName] = id.split('_')
  const catalogObject = util.findApiInCatalog(restApiId, stageName, await util.catalog())

  if (!catalogObject) {
    return util.abort(event, 404, `API with ID (${restApiId}) and Stage (${stageName}) could not be found.`)
  } else if (!catalogObject.sdkGeneration) {
    return util.abort(event, 403, `API with ID (${restApiId}) and Stage (${stageName}) is not enabled for API export generation.`)
  } else {
    let { exportType, parameters } = event.queryStringParameters
    if (typeof parameters === 'string') {
      try { parameters = JSON.parse(parameters) } catch (e) {
        return util.abort(event, 400, `Input parameters for API with ID (${restApiId}) and Stage (${stageName}) were a string, but not parsable JSON: ${parameters}`)
      }
    }
    console.log({ exportType, parameters })
    const result = await util.apigateway.getExport({
      restApiId, exportType, stageName, parameters
    }).promise()

    throw new util.Custom({
      statusCode: 200,
      isBase64Encoded: true,
      headers: { 'content-type': parameters.accept },
      body: result.body.toString('base64')
    })
  }
}
