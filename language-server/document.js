'use strict';

const TextDocument = {
  create(uri, languageId, version, text) {
    return {
      uri,
      languageId,
      version,
      getText() { return text; }
    };
  }
};

module.exports = { TextDocument };
