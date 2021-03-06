class CashId {
  static createRequestURL (opts) {
    // Create URL for holding request
    const url = new URL(`cashid:${opts.domain}${opts.path}`)

    // Set action (only if given - default is "auth")
    if (opts.action) {
      url.searchParams.set('a', opts.action)
    }

    // Set data (only if given)
    if (opts.data) {
      url.searchParams.set('d', opts.data)
    }

    // Set required fields (only if given)
    if (opts.required) {
      url.searchParams.set('r', CashId._encodeFieldsAsString(opts.required))
    }

    // Set optional fields (only if given)
    if (opts.optional) {
      url.searchParams.set('o', CashId._encodeFieldsAsString(opts.optional))
    }

    // Set nonce
    url.searchParams.set('x', opts.nonce)

    return url.href
  }

  static parseRequest (requestURL) {
    // Map of field codes to names
    const map = {
      identity: {
        1: 'name',
        2: 'family',
        3: 'nickname',
        4: 'age',
        5: 'gender',
        6: 'birthdate',
        8: 'picture',
        9: 'national'
      },
      position: {
        1: 'country',
        2: 'state',
        3: 'city',
        4: 'streetname',
        5: 'streetnumber',
        6: 'residence',
        9: 'coordinates'
      },
      contact: {
        1: 'email',
        2: 'instant',
        3: 'social',
        4: 'phone',
        5: 'postal'
      }
    }

    // Parse the URL into parts
    requestURL = new URL(requestURL)

    // Make sure it's a CashID intent
    if (requestURL.protocol.toLowerCase() !== 'cashid:') {
      throw new Error('Request does not appear to be a CashID request')
    }

    // Define response object
    const parsed = {
      domain: requestURL.pathname.split('/')[0],
      path: '/' + requestURL.pathname.split(/\/(.+)/)[1],
      action: requestURL.searchParams.get('a') || 'auth',
      required: requestURL.searchParams.get('r') || [],
      optional: requestURL.searchParams.get('o') || [],
      nonce: requestURL.searchParams.get('x') || null
    }

    // Parse the required and optional fields
    for (const fieldStatus of ['optional', 'required']) {
      // Create storage
      const fields = []
      let metadataType = ''

      // Loop through each character
      for (const char of parsed[fieldStatus]) {
        // Set metadataType to identity and go to next character
        if (char === 'i') { metadataType = 'identity'; continue }

        // Set metadataType to position and go to next character
        if (char === 'p') { metadataType = 'position'; continue }

        // Set metadataType to contact and go to next character
        if (char === 'c') { metadataType = 'contact'; continue }

        // Make sure the field is valid and add it to list of required/optional
        if (metadataType && map[metadataType][char]) {
          fields.push(map[metadataType][char])
        } else {
          throw new Error(`Unsupported field metadataType/code given: ${char}`)
        }
      }

      // Add fields to our parsed object
      parsed[fieldStatus] = fields
    }

    return parsed
  }

  static getStatusCode (name) {
    const statusCodes = {
      AuthenticationSuccessful: 0,
      RequestBroken: 100,
      RequestMissingScheme: 111,
      RequestMissingDomain: 112,
      RequestMissingNonce: 113,
      RequestMalformedScheme: 121,
      RequestMalformedDomain: 122,
      RequestInvalidDomain: 131,
      RequestInvalidNonce: 132,
      RequestAltered: 141,
      RequestExpired: 142,
      RequestConsumed: 143,
      ResponseBroken: 200,
      ResponseMissingRequest: 211,
      ResponseMissingAddress: 212,
      ResponseMissingSignature: 213,
      ResponseMissingMetadata: 214,
      ResponseMalformedAddress: 221,
      ResponseMalformedSignature: 222,
      ResponseMalformedMetadata: 223,
      ResponseInvalidMethod: 231,
      ResponseInvalidAddress: 232,
      ResponseInvalidSignature: 233,
      ResponseInvalidMetadata: 234,
      ServiceBroken: 300,
      ServiceAddressDenied: 311,
      ServiceAddressRevoked: 312,
      ServiceActionDenied: 321,
      ServiceActionUnavailable: 322,
      ServiceActionNotImplemented: 323,
      ServiceInternalError: 331
    }

    return statusCodes[name]
  }

  static _encodeFieldsAsString (fieldArray) {
    // Constants for array positions below
    const METADATA_TYPE = 0
    const METADATA_CODE = 1

    // Map of field names to metadataType+code
    const map = {
      name: 'i1',
      family: 'i2',
      nickname: 'i3',
      age: 'i4',
      gender: 'i5',
      birthdate: 'i6',
      picture: 'i8',
      national: 'i9',
      country: 'p1',
      state: 'p2',
      city: 'p3',
      streetname: 'p4',
      streetnumber: 'p5',
      residence: 'p6',
      coordinates: 'p9',
      email: 'c1',
      instant: 'c2',
      social: 'c3',
      phone: 'c4',
      postal: 'c5'
    }

    const fields = {}

    for (const field of fieldArray) {
      // Make sure field is supported
      if (!map[field]) throw new Error(`Field ${field} is not supported by CashID`)

      // If metadataType does not exist in fields, create it as array
      if (!fields[map[field][METADATA_TYPE]]) fields[map[field][METADATA_TYPE]] = []

      // Push the code to that field
      fields[map[field][METADATA_TYPE]].push(map[field][METADATA_CODE])
    }

    // Convert fields to string
    let asString = ''
    for (const metadataType of ['i', 'p', 'c']) {
      if (fields[metadataType]) {
        asString += `${metadataType}${fields[metadataType].reduce((codes, code) => codes + code, '')}`
      }
    }

    return asString
  }

  static _buildError (type, contextData = {}) {
    // Convert error name into human readable
    const humanReadable = type.split(/(?<=[a-z])(?=[A-Z])/).join(' ')
    let message = `Error ${CashId.getStatusCode[type]}: ${humanReadable}`

    // If this is "responseMissingMetadata", list the fields
    if (contextData.fields) {
      message += `: ${contextData.fields.join(' ')}`
    }

    // Create the error and the name
    const error = new Error(message)
    error.name = type
    error.nonce = contextData.nonce

    return error
  }
}

module.exports = CashId
