require('dotenv').config();
const express = require('express');
const { Octokit } = require('@octokit/rest');
const { Client } = require('@notionhq/client');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;

app.get('/issues', async (req, res) => {
  try {
    const response = await octokit.request('GET /issues', {
      filter: 'assigned',
      state: 'opened',
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const filteredData = response.data.map((issue) => ({
      repository: issue.repository.name,
      title: issue.title,
      state: issue.state,
      id: issue.number,
      url: issue.html_url,
    }));

    for (const issue of filteredData) {
      await agregarIssueANotion(issue);
    }

    res.send(filteredData);
  } catch (error) {
    res.status(500).send('Error fetching issues');
  }
});

async function agregarIssueANotion(issue) {
  try {
    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Repository: { title: [{ text: { content: issue.repository } }] },
        Issue: { rich_text: [{ text: { content: issue.title } }] },
        ID: { number: issue.id },
        URL: { url: issue.url },
        Closed: { checkbox: issue.state === 'opened' ? false : true },
      },
    });
    console.log('Issue agregado a Notion:', response);
  } catch (error) {
    console.error('Error al agregar issue a Notion:', error);
  }
}
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
