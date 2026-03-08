import { motion } from "framer-motion";

const skills = [
  "React", "TypeScript", "Node.js", "PostgreSQL",
  "Tailwind CSS", "Next.js", "Python", "Docker",
  "GraphQL", "AWS", "Git", "Figma",
];

export function About() {
  return (
    <section id="about" className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-16 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              About Me
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground">
              <p>
                I'm a developer and designer who loves building products that are
                both beautiful and functional. With years of experience in
                full-stack development, I focus on creating intuitive user
                experiences backed by robust architecture.
              </p>
              <p>
                When I'm not coding, you can find me exploring new technologies,
                contributing to open-source projects, or refining my design skills.
                I believe great software is built at the intersection of technical
                excellence and thoughtful design.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold text-foreground">
              Skills & Technologies
            </h3>
            <div className="mt-6 flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <motion.span
                  key={skill}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
