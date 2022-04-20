import * as core from '@actions/core';
import * as github from "@actions/github";
import { Octokit } from '@octokit/rest';
import { parse } from 'query-string';

interface SearchQuery {
    search:  {
        issueCount: string;
    }
}

async function run () {
    const GITHUB_TOKEN = core.getInput("GITHUB_TOKEN");
    const octokit = new Octokit({ auth: GITHUB_TOKEN })

    

    const { context } = github;

    const queryStr = `repo:${context.repo.owner}/${context.repo.repo} is:open is:pr author:${context.actor}`;

    const dataS = await octokit.search.issuesAndPullRequests({
        q: queryStr.replace(/\s/g, '+')
    });

    console.log('worked')
    console.log(dataS)

    const data: SearchQuery = await octokit.graphql(`
        query currentPRs($queryStr: String!) {
            search(query: $queryStr, type: ISSUE) {
                issueCount
            }
        }
    `, {
        queryStr
    });

    const MAX_PRS = core.getInput("MAX_PRS") || 10;
    
    if (data?.search?.issueCount > MAX_PRS) {
        await octokit.pulls.update({
            owner: context.repo.owner,
            repo: context.repo.repo,
            pull_number: context.issue.number,
            state: 'closed'
        });

        await octokit.issues.createComment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: context.issue.number,
            body: 'You reach the maximum number of open PRS'
        })

        core.setFailed('You reach the maxium number of PRs');
        
        process.exit(1);
    }

    console.log('updated');
    console.log(data);
}

run();
