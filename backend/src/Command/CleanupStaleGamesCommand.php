<?php

namespace App\Command;

use App\Entity\Game;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'app:cleanup-stale-games',
    description: 'Delete games with no activity for over 1 hour.',
)]
class CleanupStaleGamesCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $cutoff = new \DateTime('-1 hour');

        $games = $this->em->getRepository(Game::class)
            ->createQueryBuilder('g')
            ->where('g.lastActivityAt < :cutoff')
            ->setParameter('cutoff', $cutoff)
            ->getQuery()
            ->getResult();

        $count = count($games);

        foreach ($games as $game) {
            $this->em->remove($game);
        }

        $this->em->flush();

        $output->writeln("Deleted $count stale game(s) inactive for over 1 hour.");

        return Command::SUCCESS;
    }
}
