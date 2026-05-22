migrate((app) => {
  function findCollection(name) {
    try {
      return app.findCollectionByNameOrId(name)
    } catch {
      return null
    }
  }

  function saveCollection(collection) {
    app.save(collection)
    return app.findCollectionByNameOrId(collection.name)
  }

  let users = findCollection('users')
  if (!users) {
    users = saveCollection(new Collection({
      type: 'auth',
      name: 'users',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id = id || @request.auth.id != ""',
      createRule: '',
      updateRule: '@request.auth.id = id',
      deleteRule: null,
      fields: [
        {
          type: 'text',
          name: 'name',
          max: 120,
        },
      ],
      passwordAuth: {
        enabled: true,
        identityFields: ['email'],
      },
    }))
  }

  if (!findCollection('survey_prompts')) {
    saveCollection(new Collection({
      type: 'base',
      name: 'survey_prompts',
      listRule: '@request.auth.id != "" && status = "active" && (startsAt = "" || startsAt <= @now) && (endsAt = "" || endsAt >= @now)',
      viewRule: '@request.auth.id != "" && status = "active" && (startsAt = "" || startsAt <= @now) && (endsAt = "" || endsAt >= @now)',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          type: 'text',
          name: 'title',
          required: true,
          max: 180,
        },
        {
          type: 'text',
          name: 'body',
          max: 2000,
        },
        {
          type: 'select',
          name: 'kind',
          required: true,
          maxSelect: 1,
          values: ['single-choice', 'free-text'],
        },
        {
          type: 'json',
          name: 'options',
        },
        {
          type: 'select',
          name: 'placement',
          required: true,
          maxSelect: 1,
          values: ['settings', 'app-banner'],
        },
        {
          type: 'date',
          name: 'startsAt',
        },
        {
          type: 'date',
          name: 'endsAt',
        },
        {
          type: 'select',
          name: 'status',
          required: true,
          maxSelect: 1,
          values: ['draft', 'active', 'archived'],
        },
        {
          type: 'date',
          name: 'updatedAt',
        },
        {
          type: 'json',
          name: 'metadata',
        },
      ],
      indexes: [
        'CREATE INDEX idx_survey_prompts_status_placement ON survey_prompts (status, placement)',
        'CREATE INDEX idx_survey_prompts_window ON survey_prompts (startsAt, endsAt)',
      ],
    }))
  }

  if (!findCollection('survey_responses')) {
    saveCollection(new Collection({
      type: 'base',
      name: 'survey_responses',
      listRule: null,
      viewRule: null,
      createRule: '@request.auth.id != "" && @request.body.accountId = @request.auth.id',
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          type: 'text',
          name: 'promptId',
          required: true,
          max: 80,
        },
        {
          type: 'text',
          name: 'accountId',
          required: true,
          max: 80,
        },
        {
          type: 'text',
          name: 'answer',
          required: true,
          max: 2000,
        },
        {
          type: 'text',
          name: 'comment',
          max: 4000,
        },
        {
          type: 'text',
          name: 'appVersion',
          max: 80,
        },
        {
          type: 'date',
          name: 'createdAt',
        },
        {
          type: 'json',
          name: 'metadata',
        },
      ],
      indexes: [
        'CREATE INDEX idx_survey_responses_account_prompt ON survey_responses (accountId, promptId)',
        'CREATE INDEX idx_survey_responses_prompt_created ON survey_responses (promptId, createdAt)',
      ],
    }))
  }
}, (app) => {
  for (const name of ['survey_responses', 'survey_prompts']) {
    try {
      app.delete(app.findCollectionByNameOrId(name))
    } catch {
      // Already absent.
    }
  }
})
