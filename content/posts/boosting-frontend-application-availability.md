---
title: "Boosting Frontend Application Availability: My Journey from 50% to 99.9%"
date: 2024-09-14T00:00:00+05:30
draft: false
description: "Practical strategies for taking frontend application availability and crash-free sessions from under 90% to 99.9%."
tags: ["Frontend", "Availability", "Reliability", "UX", "Engineering"]
categories: ["Engineering"]
---

*Originally shared on [LinkedIn](https://www.linkedin.com/feed/update/urn:li:activity:7216905891395063808/)*

In my career across multiple organizations, I've faced significant challenges in improving the availability of frontend applications. I've seen apps with availability below 90% and crash-free sessions as low as ~50%. Through diligent work and strategic improvements, I've successfully elevated these metrics to an impressive 99.9%.

Here are the challenges I encountered and the solutions that worked, so others can leverage these strategies to enhance their application's availability and user experience.

## Availability & UX Improvement Tips

### 1. Add Alert Rules

Define precise alert rules and ensure they are tagged to the right stakeholders to minimize Mean Time to Acknowledge (MTTA) and Mean Time to Resolve (MTTR).

### 2. Implement Multi-Stage Rollouts & Self Healing

Utilize multi-stage rollouts at 5%, 10%, 25%, and 100%. Perform thorough analysis at each stage and compare with previous versions to identify deviations and new issues early.

### 3. Define Different Levels of Alerting Rules

Create different alerting rules with thresholds based on metrics like Largest Contentful Paint (LCP), crash-free sessions, global error counts, high-volume issues, and more.

### 4. Mandate End-to-End Testing

Enforce end-to-end testing for every new feature development to ensure the master branch remains stable.

### 5. Enforce Unit Testing with Minimum Coverage

Mandate unit testing with at least 80% coverage for new code to prevent breakages from future unintended side effects.

### 6. Alerting and Monitoring on Infrastructure Health

Set up alerting for potential infrastructure issues such as min/max pod counts, memory utilization, and CPU utilization to proactively address performance bottlenecks.

### 7. Implement Feature Flags

Use feature flags to enable and disable features dynamically, allowing for safer rollouts and quick rollbacks in case of issues.

### 8. Foster a Culture of Continuous Improvement

Every incident gives us learnings to prevent further incidents and automate processes to self-heal the application. Make sure to act upon action items immediately, and foster a culture of continuous improvement.

---

Let's take the challenge and give a better web experience to every user of our applications! 🚀
